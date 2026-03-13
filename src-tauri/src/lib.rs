mod commands;
mod notes;
mod windows;

use commands::NoteStoreState;
use notes::NoteStore;
use std::sync::Mutex;
use tauri::{
    tray::{MouseButtonState, TrayIconEvent},
    Manager, WindowEvent,
};
use tauri_plugin_positioner::{Position, WindowExt};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_all_notes,
            commands::create_note,
            commands::update_note,
            commands::delete_note,
            commands::pin_note,
            commands::unpin_note,
            commands::update_position,
            commands::open_note_window,
            windows::set_window_opacity,
        ])
        .setup(|app| {
            // Initialize note store
            let data_dir = dirs::data_dir()
                .expect("Could not find data directory")
                .join("Floaty");
            let file_path = data_dir.join("notes.json");
            let store = NoteStore::new(file_path);

            // Restore pinned notes
            let pinned = store.get_pinned();
            app.manage::<NoteStoreState>(Mutex::new(store));

            let app_handle = app.handle().clone();
            for note in pinned {
                let (x, y) = note
                    .position
                    .map(|p| (Some(p.x), Some(p.y)))
                    .unwrap_or((None, None));
                windows::create_floating_note_window(&app_handle, &note.id, x, y);
            }

            // Tray icon click handler
            let tray = app.tray_by_id("main").expect("No tray icon found");
            let app_handle = app.handle().clone();
            tray.on_tray_icon_event(move |_tray, event| {
                // Feed tray position to positioner plugin
                tauri_plugin_positioner::on_tray_event(&app_handle, &event);

                if let TrayIconEvent::Click { button_state: MouseButtonState::Up, .. } = event {
                    let app = &app_handle;
                    if let Some(panel) = app.get_webview_window("panel") {
                        if panel.is_visible().unwrap_or(false) {
                            let _ = panel.hide();
                        } else {
                            let _ = WindowExt::move_window(&panel, Position::TrayCenter);
                            let _ = panel.show();
                            let _ = panel.set_focus();
                        }
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            // Close-to-hide for panel
            if window.label() == "panel" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
