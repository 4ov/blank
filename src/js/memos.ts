import { createDrauu } from "drauu";
import { DrawMemo, Memo, STATIC_INDEX, TextMemo } from "./globals";
import { decreaseAllMemoIndexes, updateMemo } from "./utils";

export function createYoutubeMemo() {
    const container = document.createElement("div");
    container.addEventListener("pointerdown", (ev) => {
        console.log(ev);
    });
    container.classList.add("input");

    // const url = document.createElement("input")
    // container.append(url)

    container.innerHTML = `<lite-youtube videoid="guJLfqTFfIw"></lite-youtube>`;

    return container;
}

export function createDrawingMemo(memo: DrawMemo) {
    const container = document.createElement("div");
    container.classList.add("input");
    container.style.display = "flex";
    container.style.flexDirection = "column";

    const controls = document.createElement("div");
    controls.style.display = "flex"
    controls.style.gap = "8px"
    controls.style.padding = "8px";
    controls.style.borderBottom = "1px solid var(--foreground)";

    const undo = document.createElement("button");
    undo.innerHTML = "<-";
    undo.addEventListener("click", () => {
        d.undo();
        save()
    });

    const redo = document.createElement("button");
    redo.innerHTML = "->";
    redo.addEventListener("click", () => {
        d.redo();
        save()
    });

    const clear = document.createElement("button");
    clear.innerHTML = "clear";
    clear.addEventListener("click", () => {
        d.clear();
        save()
    });

    // const

    controls.append(undo, redo, clear);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.innerHTML = memo.svg || "";
    container.append(controls, svg);

    const d = createDrauu({
        el: svg,
        acceptsInputTypes: ["mouse", "touch"],
        brush: {
            size: 8,
            color: "currentColor",
        },
    });

    let timer;

    function save() {
        clearTimeout(timer);
        timer = setTimeout(() => {
            let result = "";
            d.el?.querySelectorAll("path").forEach((p) => {
                result += p.outerHTML;
            });

            updateMemo(memo.key, {
                svg: result,
            });
        }, 1000);
    }

    d.on("committed", save);

    return container;
}

export function createTextMemo({ text, key }: TextMemo) {
    const textarea = document.createElement("textarea");
    textarea.dir = "auto"
    textarea.classList.add("input");
    textarea.style.width = "calc(100% - 4px)"
    textarea.setAttribute("placeholder", "Add a short memo...");
    textarea.setAttribute("autocomplete", "true");

    if (text) {
        textarea.value = text;
    }

    textarea.addEventListener("focus", function (e) {
        textarea.classList.add("active");

        decreaseAllMemoIndexes();

        // activeMemo = textarea.parentNode;
        // activeMemo.style.zIndex = STATIC_INDEX;
    });

    textarea.addEventListener(
        "blur",
        (e) => {
            textarea.classList.remove("active");
        },
        {
            passive: false,
            capture: false,
        }
    );
    textarea.addEventListener(
        "input",
        function (e) {
            updateMemo(key, { text: textarea.value });
        },
        { passive: false, capture: false }
    );

    return textarea;
}
