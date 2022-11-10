import { appDir, join } from "@tauri-apps/api/path";
import { atom } from "jotai";
import _ from "lodash";
import Dreambooth from "./commands/dreambooth";
import { GpuInfo } from "./Gpu";

export const gpuAtom = atom<GpuInfo>({
    name: "unknown",
    meminfo: {
        free: 0,
        total: 0,
        used: 0,
    }
});

export const updateGpuAtom = atom(null, (get, set, update: GpuInfo) => {
    set(gpuAtom, update);
    set(dreamboothAtom, get(dreamboothAtom).withGpu(update));
});

export const dreamboothAtom = atom<Dreambooth>(new Dreambooth("sks"));
export const updateClassPromptAtom = atom(null, async (get, set, prompt: string) => {
    const classDir = await join(get(appDirAtom), prompt);
    set(dreamboothAtom, get(dreamboothAtom).with({ "classDir": classDir, "classPrompt": prompt }));
});
export const appDirAtom = atom(async () => appDir());