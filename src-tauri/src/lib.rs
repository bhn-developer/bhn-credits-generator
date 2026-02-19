// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use tauri_plugin_shell::ShellExt;
use tempfile::TempDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GenerateVideoRequest {
    pub html_content: String,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub scroll_speed: f64,
    pub total_scroll_distance: f64,
    pub include_scroll_in_out: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateVideoResponse {
    pub success: bool,
    pub message: String,
    pub video_path: Option<String>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
