import { ObjectType } from "deta/dist/types/types/basic";
import { GRID_SIZE, Memo, MemoTypes, loading } from "./globals";
import { Base } from "deta";

export function chooseType(): Promise<(typeof MemoTypes)[number]> {
    const dialog = document.querySelector<HTMLDialogElement>("#newTypeChooser");
    if (!dialog) throw new Error("something went wrong");
    return new Promise((r, j) => {
        dialog.showModal();
        dialog.onsubmit = (ev) => {
            const value = new FormData(ev.target as HTMLFormElement).get(
                "type"
            ) as (typeof MemoTypes)[number];
            r(value);
        };
    });
}

export interface Bounds {
    edge: "bottom" | "top" | "left" | "right";
    offset: number;
}

const memodb = Base("memos");
const confdb = Base("config");

export function confirm(text) {
    return window.confirm(text);
}

export async function getConf(key) {
    const r = await confdb.get(key);
    return r ? r.value : null;
}
export async function setConf(key, item) {
    await confdb.put(item, key);
}

export async function createMemo(item: Memo) {
    try {
        loading.set(true);
        await memodb.put(item as any);
    } finally {
        loading.set(false);
    }
    // console.log("create", id, item)
}

export async function updateMemo(id, item) {
    try {
        loading.set(true);
        await memodb.update(item, id);
    } finally {
        loading.set(false);
    }
}

export async function fetchMemos() {
    try {
        loading.set(true);
        return (await memodb.fetch()).items;
    } finally {
        loading.set(false);
    }
}

export async function deleteMemo(id) {
    try{
      loading.set(true);
      await memodb.delete(id);
    }finally{
      loading.set(false);

    }
}

export function snapToGrid(value, grid) {
    return grid * Math.round(value / grid);
}

export function checkBounds(parent, child) {
    let bounds: Bounds | null = null;

    if (parent.top > child.top) {
        bounds = { edge: "top", offset: 0 };
    }
    if (parent.left > child.left) {
        bounds = { edge: "left", offset: 0 };
    }
    if (parent.top + parent.height < child.top + child.height) {
        bounds = {
            edge: "bottom",
            offset: snapToGrid(parent.height - child.height, GRID_SIZE),
        };
    }
    if (parent.left + parent.width < child.left + child.width) {
        bounds = {
            edge: "right",
            offset: snapToGrid(parent.width - child.width, GRID_SIZE),
        };
    }

    return bounds;
}

export function generateUUID() {
    return "xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export function decreaseAllMemoIndexes() {
    const memos = document.getElementsByClassName(
        "memo"
    ) as HTMLCollectionOf<HTMLDivElement>;
    for (const memo of memos) {
        let index = memo.style.zIndex;
        //@ts-ignore TODO: ??
        memo.style.zIndex = --index;
    }
}
