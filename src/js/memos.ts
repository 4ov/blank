import { createDrauu } from "drauu";
import { DrawMemo, ImgMemo, Memo, STATIC_INDEX, TextMemo } from "./globals";
import { decreaseAllMemoIndexes, downloadFile, updateMemo, uploadFile } from "./utils";

//@ts-ignore
import undoIcon from "../assets/icons/undo.svg";
//@ts-ignore
import redoIcon from "../assets/icons/redo.svg";

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
    container.classList.add("input", "drawing");
    container.style.display = "flex";
    container.style.flexDirection = "column";

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "8px";
    controls.style.padding = "8px";
    controls.style.borderBottom = "1px solid var(--foreground)";

    const undo = document.createElement("button");
    undo.classList.add("btn");
    undo.innerHTML = `<img src="${undoIcon}" width=24 />`;
    undo.addEventListener("click", () => {
        d.undo();
        save();
    });

    const redo = document.createElement("button");
    redo.classList.add("btn");
    redo.innerHTML = `<img src="${redoIcon}" width=24 />`;
    redo.addEventListener("click", () => {
        d.redo();
        save();
    });

    const clear = document.createElement("button");
    clear.classList.add("btn");
    clear.innerHTML = "clear";
    clear.addEventListener("click", () => {
        d.clear();
        save();
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

    let timer: any;

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
    textarea.dir = "auto";
    textarea.classList.add("input");
    textarea.style.width = "calc(100% - 4px)";
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

export function createImgMemo(memo: ImgMemo) {
    const { filepath, key } = memo
    const container = document.createElement("div");
    container.classList.add("input", "drawing");
    container.style.display = "flex";
    container.style.flexDirection = "column";

    container.addEventListener("drop", async (ev) => {
        ev.preventDefault();

        //! this is weired
        console.log(ev.dataTransfer?.items);
        
        if (!ev.dataTransfer?.items || ev.dataTransfer.items.length < 1) {
            throw new Error("no items");
        }
        const items = ev.dataTransfer.items;
        const file = items[0].getAsFile();
        if (!file) throw new Error("cannot get drop as file");
        const mime = file.type || "image/jpeg";
        if(!mime.startsWith("image/"))throw new Error("only images allowed")
        const result = await uploadFile(file)
        await updateMemo(key, { filepath: result })

    });

    container.addEventListener("dragover", (ev) => {
        ev.preventDefault();
    });

    // const lg = document.createElement("div");
    // Object.assign(lg.style, {
    //     display: "flex",
    //     background: "red",
    // } as { [K in keyof HTMLElement["style"]]: HTMLElement["style"][K] });

    // container.append(lg);

    if(filepath){
        downloadFile(filepath).then(async blob=>{
            if(!blob){
                await updateMemo(key, {
                    filepath: null
                })
                return
            }
            const url = URL.createObjectURL(blob)
            const img = document.createElement("img")
            img.src = url
            // img.style.width = "100%"
            img.style.height = "100%"
            img.style.objectFit = "contain"
            container.append(img)
            
        })
        
    }

    end:
    return container;
}
