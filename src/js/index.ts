import {
    GRID_SIZE,
    MARGIN,
    DRAG_INDEX,
    STATIC_INDEX,
    DEFAULT_MEMO,
    Memo,
    MemoTypes,
    TYPE_CHOOSER_SELECTOR,
    activeMemo,
    TextMemo,
    DrawMemo,
    loading,
} from "./globals";
import {
    snapToGrid,
    confirm,
    generateUUID,
    decreaseAllMemoIndexes,
    checkBounds,
    updateMemo,
    deleteMemo,
    createMemo,
    fetchMemos,
    getConf,
    setConf,
    chooseType,
} from "./utils";
import { createDrawingMemo, createTextMemo, createYoutubeMemo } from "./memos";

import "../sass/index.scss";

let theme = "light";

let main, canvas, board, selection;
let currentMouse, currentSize;

//? SETUP
const chooser = document.querySelector<HTMLDialogElement>(
    TYPE_CHOOSER_SELECTOR
)!;
MemoTypes.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    chooser.querySelector<HTMLSelectElement>("select")!.append(option);
});

const loader = document.querySelector<HTMLElement>("#loading")!;
loading.subscribe((v) => {
    if (v) loader.style.display = "block";
    else loader.style.display = "none";
});

//? SETUP

/*
  Generic Event Handlers
*/

function onMouseDown(e) {
    if (e.target === board) {
        handleBoardDragStart(e);
    } else {
        if (e.target.classList[0] === "drag") {
            handleMemoDragStart(e);
        } else if (e.target.classList[0] === "resize") {
            handleMemoResizeStart(e);
        }
    }
}

/*
  Memo Functions and Handlers
*/
// storage
function newMemo(data: Memo & { type: string }) {
    let { type, key: id, position, size } = data;
    type ||= "text";
    const memo = document.createElement("div");
    memo.addEventListener("pointerdown", (ev) => {
        decreaseAllMemoIndexes();
        memo.style.zIndex = STATIC_INDEX;
    });
    memo.dataset.default = "true";

    memo.setAttribute("data-id", id);
    memo.classList.add("memo");
    memo.style.top = `${position.top}px`;
    memo.style.left = `${position.left}px`;
    memo.style.width = `${size.width}px`;
    memo.style.height = `${size.height}px`;
    memo.style.zIndex = STATIC_INDEX;

    switch (type) {
        case "text":
            memo.appendChild(createTextMemo(data as TextMemo));
            break;
        // case "youtube":
        //     memo.appendChild(createYoutubeMemo());
        //     break;
        case "drawing":
            memo.appendChild(createDrawingMemo(data as DrawMemo));
            break;
        default:
            console.log(data);
    }

    const drag = document.createElement("div");
    drag.classList.add("drag");
    drag.addEventListener("mousedown", onMouseDown);
    drag.addEventListener("touchstart", onMouseDown);
    memo.appendChild(drag);

    const close = document.createElement("div");
    close.classList.add("close");
    close.innerHTML = "×";
    close.addEventListener("mouseup", handleDeleteMemo);
    close.addEventListener("touchend", handleDeleteMemo);
    memo.appendChild(close);

    

    const resize = document.createElement("div");
    resize.classList.add("resize");
    resize.addEventListener("mousedown", onMouseDown);
    resize.addEventListener("touchstart", onMouseDown);
    memo.appendChild(resize);

    return memo;
}

function handleMemoDragStart(e) {
    if (e.which === 1 || e.touches) {
        decreaseAllMemoIndexes();
        const memo = e.target.parentNode as HTMLDivElement;
        memo.classList.add("active");
        memo.style.zIndex = STATIC_INDEX;
        activeMemo.set(memo);

        const textarea = memo.querySelector(".input") as HTMLElement;
        textarea.blur();

        e.target.style.backgroundColor = "var(--gray)";
        e.target.style.cursor = "grabbing";

        document.body.style.cursor = "grabbing";

        const x =
            e.touches && e.touches.length > 0
                ? snapToGrid(e.touches[0].clientX, GRID_SIZE)
                : snapToGrid(e.clientX, GRID_SIZE);
        const y =
            e.touches && e.touches.length > 0
                ? snapToGrid(e.touches[0].clientY, GRID_SIZE)
                : snapToGrid(e.clientY, GRID_SIZE);

        currentMouse = { x, y };

        document.addEventListener("mousemove", handleMemoDragMove, {
            passive: false,
            //@ts-ignore
            useCapture: false,
            capture: false,
        });
        document.addEventListener("touchmove", handleMemoDragMove, {
            passive: false,
            //@ts-ignore
            useCapture: false,
            capture: false,
        });

        document.addEventListener("mouseup", handleMemoDragEnd, {
            passive: false,
            //@ts-ignore
            useCapture: false,
            capture: false,
        });
        document.addEventListener("touchcancel", handleMemoDragEnd, {
            passive: false,
            //@ts-ignore
            useCapture: false,
            capture: false,
        });
        document.addEventListener("touchend", handleMemoDragEnd, {
            passive: false,
            //@ts-ignore
            useCapture: false,
            capture: false,
        });
    }
}

function handleMemoDragMove(e) {
    //TODO: check if activeMemo available
    const memo = activeMemo.get();
    if (!memo) throw new Error("no active memo");
    const isActive = activeMemo.get()?.classList.contains("active");

    if (isActive) {
        const x =
            e.touches && e.touches.length > 0
                ? snapToGrid(e.touches[0].clientX, GRID_SIZE)
                : snapToGrid(e.clientX, GRID_SIZE);
        const y =
            e.touches && e.touches.length > 0
                ? snapToGrid(e.touches[0].clientY, GRID_SIZE)
                : snapToGrid(e.clientY, GRID_SIZE);

        memo.style.top = `${
            activeMemo.get()!.offsetTop - (currentMouse.y - y)
        }px`;
        memo.style.left = `${memo.offsetLeft - (currentMouse.x - x)}px`;

        currentMouse = { x, y };
    }
}

// storage
function handleMemoDragEnd(e) {
    const memo = activeMemo.get();
    if (!memo) throw new Error("no active memo");
    const bounds = checkBounds(
        board.getBoundingClientRect(),
        memo.getBoundingClientRect()
    );

    const x =
        e.touches && e.touches.length > 0
            ? snapToGrid(e.touches[0].clientX, GRID_SIZE)
            : snapToGrid(e.clientX, GRID_SIZE);
    const y =
        e.touches && e.touches.length > 0
            ? snapToGrid(e.touches[0].clientY, GRID_SIZE)
            : snapToGrid(e.clientY, GRID_SIZE);

    let top = memo.offsetTop - (currentMouse.y - y);
    let left = memo.offsetLeft - (currentMouse.x - x);

    if (bounds) {
        if (bounds.edge === "top") {
            top = bounds.offset;
        } else if (bounds.edge === "bottom") {
            top = bounds.offset;
        } else if (bounds.edge === "left") {
            left = bounds.offset;
        } else if (bounds.edge === "right") {
            left = bounds.offset;
        }
    }

    memo.style.top = `${top}px`;
    memo.style.left = `${left}px`;
    memo.classList.remove("active");

    const drag = memo.querySelectorAll(".drag")[0] as HTMLElement;
    drag.style.cursor = "grab";
    drag.style.backgroundColor = "transparent";

    const input = memo.querySelector(".input") as HTMLElement;
    console.log(input);

    input.focus();

    const id = memo.dataset.id;
    updateMemo(id, { position: { top, left } });

    document.body.style.cursor = "initial";
    activeMemo.set(null);
    currentMouse = null;

    document.removeEventListener("mousemove", handleMemoDragMove);
    document.removeEventListener("touchmove", handleMemoDragMove);

    document.removeEventListener("mouseup", handleMemoDragEnd);
    document.removeEventListener("touchcancel", handleMemoDragEnd);
    document.removeEventListener("touchend", handleMemoDragEnd);
}

function handleDeleteMemo(e) {
    if (confirm("Are you sure you want to remove this memo?")) {
        const id = e.target.parentNode.dataset.id;
        deleteMemo(id);
        board.removeChild(e.target.parentNode);
    }
}

function handleMemoResizeStart(e) {
    if (e.which === 1 || e.touches) {
        decreaseAllMemoIndexes();
        const memo = e.target.parentNode as HTMLDivElement;
        memo.classList.add("active");
        memo.style.zIndex = STATIC_INDEX;
        activeMemo.set(memo);

        const textarea = memo.querySelector(".input") as HTMLElement;
        textarea.blur();

        document.body.style.cursor = "nw-resize";

        e.target.style.backgroundColor = "var(--gray)";

        const x =
            e.touches && e.touches.length > 0
                ? snapToGrid(e.touches[0].clientX, GRID_SIZE)
                : snapToGrid(e.clientX, GRID_SIZE);
        const y =
            e.touches && e.touches.length > 0
                ? snapToGrid(e.touches[0].clientY, GRID_SIZE)
                : snapToGrid(e.clientY, GRID_SIZE);

        const rect = memo.getBoundingClientRect();
        const width = parseInt(rect.width.toString(), 10);
        const height = parseInt(rect.height.toString(), 10);

        currentMouse = { x, y };
        currentSize = { width, height };

        document.addEventListener("mousemove", handleMemoResizeMove, {
            passive: false,
            //@ts-ignore
            useCapture: false,
            capture: false,
        });
        document.addEventListener("touchmove", handleMemoResizeMove, {
            passive: false,
            //@ts-ignore
            useCapture: false,
            capture: false,
        });

        document.addEventListener("mouseup", handleMemoResizeEnd, {
            passive: false,
            //@ts-ignore
            useCapture: false,
            capture: false,
        });
        document.addEventListener("touchcancel", handleMemoResizeEnd, {
            passive: false,
            //@ts-ignore
            useCapture: false,
            capture: false,
        });
        document.addEventListener("touchend", handleMemoResizeEnd, {
            passive: false,
            //@ts-ignore
            useCapture: false,
            capture: false,
        });
    }
}

function handleMemoResizeMove(e) {
    const memo = activeMemo.get();
    if (!memo) throw new Error("no active memo");
    const isActive = memo.classList.contains("active");

    if (isActive) {
        const x =
            e.touches && e.touches.length > 0
                ? snapToGrid(e.touches[0].clientX, GRID_SIZE)
                : snapToGrid(e.clientX, GRID_SIZE);
        const y =
            e.touches && e.touches.length > 0
                ? snapToGrid(e.touches[0].clientY, GRID_SIZE)
                : snapToGrid(e.clientY, GRID_SIZE);

        const width = currentSize.width + (x - currentMouse.x) - 2;
        const height = currentSize.height + (y - currentMouse.y) - 2;

        memo.style.width = `${width}px`;
        memo.style.height = `${height}px`;
    }
}

// storage
function handleMemoResizeEnd(e) {
    const x =
        e.touches && e.touches.length > 0
            ? snapToGrid(e.touches[0].clientX, GRID_SIZE)
            : snapToGrid(e.clientX, GRID_SIZE);
    const y =
        e.touches && e.touches.length > 0
            ? snapToGrid(e.touches[0].clientY, GRID_SIZE)
            : snapToGrid(e.clientY, GRID_SIZE);

    const width = currentSize.width + (x - currentMouse.x) - 2;
    const height = currentSize.height + (y - currentMouse.y) - 2;

    const memo = activeMemo.get()!;
    memo.style.width = `${width}px`;
    memo.style.height = `${height}px`;

    const bounds = checkBounds(
        board.getBoundingClientRect(),
        memo.getBoundingClientRect()
    );

    if (bounds) {
        let top = memo.offsetTop;
        let left = memo.offsetLeft;

        if (bounds.edge === "top") {
            top = bounds.offset;
        } else if (bounds.edge === "bottom") {
            top = bounds.offset;
        } else if (bounds.edge === "left") {
            left = bounds.offset;
        } else if (bounds.edge === "right") {
            left = bounds.offset;
        }

        memo.style.top = `${top}px`;
        memo.style.left = `${left}px`;
    }

    const resize = memo.querySelectorAll(".resize")[0] as HTMLDivElement;
    resize.style.cursor = "nw-resize";
    resize.style.backgroundColor = "transparent";

    memo.classList.remove("active");

    const textarea = memo.querySelector(".input") as HTMLElement;
    textarea.focus();

    const id = memo.dataset.id;
    updateMemo(id, { size: { width, height } });

    document.body.style.cursor = "initial";
    activeMemo.set(null);
    currentSize = null;

    document.removeEventListener("mousemove", handleMemoResizeMove, {
        //@ts-ignore

        passive: false,
        //@ts-ignore
        useCapture: false,
        capture: false,
    });
    document.removeEventListener("touchmove", handleMemoResizeMove, {
        //@ts-ignore
        passive: false,
        useCapture: false,
    });

    document.removeEventListener("mouseup", handleMemoResizeEnd, {
        //@ts-ignore
        passive: false,
        useCapture: false,
    });
    document.removeEventListener("touchcancel", handleMemoResizeEnd, {
        //@ts-ignore
        passive: false,
        useCapture: false,
    });
    document.removeEventListener("touchend", handleMemoResizeEnd, {
        //@ts-ignore
        passive: false,
        useCapture: false,
    });
}

/*
  Board Functions and Handlers
*/

function handleBoardDragStart(e) {
    if (e.which === 1 || e.touches) {
        document.body.style.cursor = "crosshair";

        board.classList.add("active");

        const rect = board.getBoundingClientRect();
        const x =
            e.touches && e.touches.length > 0
                ? snapToGrid(e.touches[0].clientX - rect.left, GRID_SIZE)
                : snapToGrid(e.clientX - rect.left, GRID_SIZE);
        const y =
            e.touches && e.touches.length > 0
                ? snapToGrid(e.touches[0].clientY - rect.top, GRID_SIZE)
                : snapToGrid(e.clientY - rect.top, GRID_SIZE);

        currentMouse = { x, y };

        selection = document.createElement("div");
        selection.setAttribute("id", "selection");
        selection.style.zIndex = DRAG_INDEX;

        board.appendChild(selection);

        document.addEventListener("mousemove", handleBoardDragMove);
        document.addEventListener("touchmove", handleBoardDragMove);

        document.addEventListener("mouseup", handleBoardDragEnd);
        document.addEventListener("touchcancel", handleBoardDragEnd);
        document.addEventListener("touchend", handleBoardDragEnd);
    }
}

function handleBoardDragMove(e) {
    const rect = board.getBoundingClientRect();
    const x =
        e.touches && e.touches.length > 0
            ? snapToGrid(e.touches[0].clientX - rect.left, GRID_SIZE)
            : snapToGrid(e.clientX - rect.left, GRID_SIZE);
    const y =
        e.touches && e.touches.length > 0
            ? snapToGrid(e.touches[0].clientY - rect.top, GRID_SIZE)
            : snapToGrid(e.clientY - rect.top, GRID_SIZE);

    const top = y - currentMouse.y < 0 ? y : currentMouse.y;
    const left = x - currentMouse.x < 0 ? x : currentMouse.x;
    const width = Math.abs(x - currentMouse.x) + 1;
    const height = Math.abs(y - currentMouse.y) + 1;

    selection.style.top = `${top}px`;
    selection.style.left = `${left}px`;
    selection.style.width = `${width}px`;
    selection.style.height = `${height}px`;
}

// storage
async function handleBoardDragEnd(e: Event) {
    //TODO: ask for a type

    const boardRect = board.getBoundingClientRect();
    const selectionRect = selection.getBoundingClientRect();

    const width = selectionRect.width - 2;
    const height = selectionRect.height - 2;

    let top = selectionRect.top - boardRect.top;
    let left = selectionRect.left - boardRect.left;

    const bounds = checkBounds(boardRect, selectionRect);

    if (bounds) {
        if (bounds.edge === "top") {
            top = bounds.offset;
        } else if (bounds.edge === "bottom") {
            top = bounds.offset;
        } else if (bounds.edge === "left") {
            left = bounds.offset;
        } else if (bounds.edge === "right") {
            left = bounds.offset;
        }
    }

    board.removeChild(selection);
    if (width >= 80 && height >= 80) {
        const type = await chooseType();
        const id = generateUUID();
        const memo = newMemo({
            type,
            default: false,
            key: id,
            position: {
                top,
                left,
            },
            size: {
                width,
                height,
            },
            text: null,
        } as Memo & { type: string });
        board.appendChild(memo);

        const textarea = memo.querySelector(".input") as HTMLTextAreaElement;
        textarea.focus();
        await createMemo({
            type,
            key: id,
            position: { top, left },
            size: { width, height },
        } as Memo & { type: string });
        activeMemo.set(memo);
    }

    document.body.style.cursor = "initial";
    board.classList.remove("active");
    // board.removeChild(selection);

    document.removeEventListener("mousemove", handleBoardDragMove, {
        passive: false,
        useCapture: false,
    } as any);
    document.removeEventListener("touchmove", handleBoardDragMove, {
        passive: false,
        useCapture: false,
    } as any);

    document.removeEventListener("mouseup", handleBoardDragEnd, {
        passive: false,
        useCapture: false,
    } as any);
    document.removeEventListener("touchcancel", handleBoardDragEnd, {
        passive: false,
        useCapture: false,
    } as any);
    document.removeEventListener("touchend", handleBoardDragEnd, {
        passive: false,
        useCapture: false,
    } as any);
}

/*
  App Functions
*/

// storage
function toggleTheme() {
    const body = document.body;
    if (theme === "light") {
        body.classList.add("dark");
        theme = "dark";
        setConf("theme", "dark");

        // setLocalStorageItem("manifest_theme", "dark");
    } else {
        body.classList.remove("dark");
        setConf("theme", "light");
        theme = "light";
        // setLocalStorageItem("manifest_theme", "light");
    }

    // Redraw the canvas
    onResize();
}

// storage
async function handleTheme() {
    const body = document.body;
    const savedPreference = await getConf("theme");

    // Prefer saved preference over OS preference
    if (savedPreference) {
        if (savedPreference === "dark") {
            body.classList.add("dark");
            theme = "dark";
        } else {
            body.classList.remove("dark");
            theme = "light";
        }
        return;
    }

    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        body.classList.add("dark");
        theme = "dark";
    }
}

function onKeydown(e) {
    if ((e.code === "KeyT" || e.keyCode === 84) && e.altKey) {
        toggleTheme();
    }
}

function onResize() {
    main.style.width = `${window.innerWidth}px`;
    main.style.height = `${window.innerHeight}px`;

    const width = window.innerWidth - MARGIN - 1;
    const height = window.innerHeight - MARGIN + 1;

    canvas.setAttribute("width", width);
    canvas.setAttribute("height", height);

    canvas.style.top = `${MARGIN / 2}px`;
    canvas.style.left = `${MARGIN / 2}px`;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext("2d");

    for (let x = 0; x <= width; x += GRID_SIZE) {
        for (let y = 0; y <= height; y += GRID_SIZE) {
            context.fillStyle =
                theme === "light"
                    ? "rgba(0, 0, 0, 0.5)"
                    : "rgba(255, 255, 255, 0.4)";
            context.beginPath();
            context.rect(x, y, 1, 1);
            context.fill();
        }
    }

    board.style.top = `${MARGIN / 2}px`;
    board.style.left = `${MARGIN / 2}px`;
    board.style.width = `${width}px`;
    board.style.height = `${height}px`;

    currentMouse = null;
    currentSize = null;
}

// storage
async function onLoad() {
    handleTheme();

    main = document.createElement("main");
    main.setAttribute("id", "app");

    canvas = document.createElement("canvas");
    canvas.setAttribute("id", "grid");

    board = document.createElement("section");
    board.setAttribute("id", "board");

    board.addEventListener("mousedown", onMouseDown, {
        passive: false,
        useCapture: false,
    });
    board.addEventListener("touchstart", onMouseDown, {
        passive: false,
        useCapture: false,
    });

    main.appendChild(canvas);
    main.appendChild(board);
    document.body.appendChild(main);

    document.body.addEventListener("touchmove", (ev) => ev.preventDefault(), {
        passive: false,
        capture: false,
        useCapture: false,
        //TODO: fix this
    } as any);

    // const memos = getLocalStorageItem("manifest_memos");
    const memos = await fetchMemos();
    // console.log("memos", memos);
    if (!memos || Object.keys(memos).length === 0) {
        const memo = newMemo(DEFAULT_MEMO);
        board.appendChild(memo);
    } else {
        for (const key of Object.keys(memos)) {
            const memo = newMemo({
                ...memos[key],
                id: memos[key].key,
            });
            board.appendChild(memo);
        }
    }

    onResize();
}

window.addEventListener("resize", onResize);
window.addEventListener("load", onLoad);
window.addEventListener("keydown", onKeydown);
