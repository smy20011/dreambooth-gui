import { appDir } from "@tauri-apps/api/path";
import { atom } from "jotai";
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
export const appDirAtom = atom(async () => appDir());