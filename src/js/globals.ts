import { atom } from "nanostores";
import mitt from "mitt";
export const MARGIN = 48;
export const GRID_SIZE = 10;

export const DRAG_INDEX = "99999";
export const STATIC_INDEX = "99998";

export const activeMemo = atom<null | HTMLDivElement>(null);
export const loading = atom<boolean>(false);
export const bus = mitt<{
    [K: `update:${string}`]: Memo;
}>();

export const TYPE_CHOOSER_SELECTOR = "#newTypeChooser";

export const MemoTypes = ["img", "text", "drawing"] as const;

export interface BaseMemo {
    // type: (typeof MemoTypes)[number];
    key: string;
    position: {
        top: number;
        left: number;
    };
    size: {
        width: number;
        height: number;
    };
}

export interface DrawMemo extends BaseMemo {
    type: "drawing";
    svg: string;
}

export interface TextMemo extends BaseMemo {
    type: "text";
    text: string | null;
}

export interface ImgMemo extends BaseMemo {
    type: "img";
    filepath: string | null;
}

export type Memo = DrawMemo | TextMemo | ImgMemo;

export const DEFAULT_MEMO: Memo = {
    type: "text",
    key: "6838d7f97cc4",
    text: "Blank is a grid-based pinboard for note taking.\n\nSimply click and drag anywhere to create a memo and snap it to the grid. All memos can be moved, resized, deleted and are saved in your app's database.\n\nTo toggle between dark and light modes you can press Alt + T.\n\nBlank is free and completely open-source. If you find a bug or have a suggestion feel free to file an issue on Github.\n\nhttps://github.com/abdelhai/blank",
    position: {
        top: 50,
        left: 50,
    },
    size: {
        width: 379,
        height: 309,
    },
};
