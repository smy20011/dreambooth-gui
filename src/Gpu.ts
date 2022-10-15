import { invoke } from "@tauri-apps/api";

export interface MemoryInfo {
    free: number;
    total: number;
    used: number;
}

export interface GpuInfo {
    name: string;
    meminfo: MemoryInfo;
}
export function GetGpuInfo(): Promise<GpuInfo> {
    return invoke<GpuInfo>('gpu_info');
}
