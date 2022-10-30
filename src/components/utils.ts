import { exists, createDir } from "@tauri-apps/api/fs";
import { join, appDir } from "@tauri-apps/api/path";
import { SetStateAction } from "react";
import { State } from "../state";

export type StateKey = keyof State;

export function updateStateField(setState: (update: SetStateAction<State>) => void, name: StateKey, value: any) {
    setState(s => ({ ...s, [name]: value }));
}

export function bind(state: State, setState: (update: SetStateAction<State>) => void, name: StateKey) {
    return {
        value: state[name] as any,
        onChange: (t: any) => updateStateField(setState, name, t.target.value)
    }
}

export async function getClassDir(prompt: string | undefined) {
    if (!prompt) {
        return "";
    }
    return await join(await appDir(), prompt);
}

export async function ensureDir(dir: string) {
    if (dir && !(await exists(dir) as unknown as boolean)) {
        await createDir(dir, { recursive: true });
    }
}

