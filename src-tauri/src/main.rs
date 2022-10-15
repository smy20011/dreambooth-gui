#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::str;

use nvml_wrapper::{error::NvmlError, struct_wrappers::device::MemoryInfo, Nvml};
use serde::{Deserialize, Serialize};

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Serialize, Deserialize)]
struct GpuInfo {
    name: String,
    meminfo: MemoryInfo,
}

fn gpu_info_impl() -> Result<GpuInfo, NvmlError> {
    let nvml = Nvml::init()?;
    let device = nvml.device_by_index(0)?;

    return Ok(GpuInfo {
        name: device.name()?,
        meminfo: device.memory_info()?,
    });
}

#[tauri::command]
async fn gpu_info() -> Result<GpuInfo, String> {
    gpu_info_impl().map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, gpu_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
