import { exists, createDir } from "@tauri-apps/api/fs";
import { join, appDir } from "@tauri-apps/api/path";
import { Atom, SetStateAction, useAtom, atom } from "jotai";
import { PrimitiveAtom, SetAtom } from "jotai/core/atom";
import { loadable } from "jotai/utils"
import _ from "lodash";


export function updateStateField<T>(setState: (update: SetStateAction<T>) => void, name: keyof T, value: any) {
    setState(s => _.assign(_.clone(s), { [name]: value }));
}

export function bind<T>(state: T, setState: (update: SetStateAction<T>) => void, name: keyof T) {
    return {
        value: state[name] as any,
        onChange: (t: any) => updateStateField(setState, name, t.target.value)
    }
}

export function useAtomForm<Value>(atom: PrimitiveAtom<Value>): [Value, SetAtom<SetStateAction<Value>, void>, (name: keyof Value) => any] {
    const [state, setState] = useAtom<Value>(atom);
    return [
        state, setState, (name: keyof Value) => bind(state, setState, name)
    ]
}

export function asyncAtomWithCache<Value>(orig: Atom<Promise<Value>>, defaultValue: Value): Atom<Value> {
    const loadableAtom = loadable(orig);
    let cache = [defaultValue];
    return atom((get) => {
        const value = get(loadableAtom);
        if (value.state == "hasData") {
            cache[0] = value.data;
        }
        return cache[0];
    });
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

