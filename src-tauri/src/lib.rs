mod commands;
mod importer;
mod scanner;
mod store;
mod tray;

use commands::AppState;
use std::sync::Mutex;
use tauri::{Emitter, Manager};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            // Load the library once and keep it in memory for the whole session.
            let library = store::load(app.handle());
            app.manage(AppState {
                library: Mutex::new(library),
            });

            tray::create_tray(app.handle())?;

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }

            // The tray needs to know when the deck changes track.
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let _ = handle.emit("kassete://ready", ());
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_library,
            commands::app_info,
            commands::scan_library,
            commands::add_scan_path,
            commands::remove_scan_path,
            commands::set_scan_path_enabled,
            commands::update_tape,
            commands::patch_tape_state,
            commands::set_track_durations,
            commands::delete_tape,
            commands::reorder_tapes,
            commands::reveal_tape_folder,
            commands::update_settings,
            commands::set_skin,
            commands::read_audio_bytes,
            commands::read_image_bytes,
            commands::import_library,
            commands::import_audio_files,
            commands::export_library,
            commands::set_window_theme,
        ])
        .run(tauri::generate_context!())
        .expect("Foldman failed to start");
}
