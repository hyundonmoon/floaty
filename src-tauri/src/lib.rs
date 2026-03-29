mod commands;
mod notes;
mod preferences;
mod windows;

use commands::{NoteStoreState, PreferencesState};
use notes::NoteStore;
use preferences::PreferencesStore;
use std::sync::Mutex;
use tauri::{
    tray::{MouseButtonState, TrayIconEvent},
    Manager, RunEvent, WebviewWindow, WindowEvent,
};
use tauri_plugin_positioner::{Position, WindowExt};

fn get_saved_panel_position(app: &tauri::AppHandle) -> Option<notes::Position> {
    app.state::<PreferencesState>().lock().unwrap().get_panel_position()
}

fn show_panel(panel: &WebviewWindow, saved_position: Option<notes::Position>, fallback: Position) {
    if let Some(pos) = saved_position {
        let _ = panel.set_position(tauri::Position::Logical(tauri::LogicalPosition {
            x: pos.x,
            y: pos.y,
        }));
    } else {
        let _ = WindowExt::move_window(panel, fallback);
    }
    let _ = panel.show();
    let _ = panel.set_focus();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_all_notes,
            commands::create_note,
            commands::update_note,
            commands::update_note_content,
            commands::delete_note,
            commands::pin_note,
            commands::unpin_note,
            commands::update_position,
            commands::update_size,
            commands::update_panel_size,
            commands::update_panel_position,
            commands::open_note_window,
            commands::open_url,
            windows::set_window_opacity,
        ])
        .setup(|app| {
            let data_dir = dirs::data_dir()
                .expect("Could not find data directory")
                .join("Floaty");
            let file_path = data_dir.join("notes.json");
            let store = NoteStore::new(file_path);

            // Restore pinned notes
            let pinned = store.get_pinned();
            app.manage::<NoteStoreState>(Mutex::new(store));

            let prefs_path = data_dir.join("preferences.json");
            let prefs_store = PreferencesStore::new(prefs_path);

            // Restore panel size
            if let Some(panel_size) = prefs_store.get_panel_size() {
                if let Some(panel) = app.get_webview_window("panel") {
                    let _ = panel.set_size(tauri::Size::Logical(tauri::LogicalSize {
                        width: panel_size.width,
                        height: panel_size.height,
                    }));
                }
            }

            let saved_panel_position = prefs_store.get_panel_position();
            app.manage::<PreferencesState>(Mutex::new(prefs_store));

            let app_handle = app.handle().clone();
            for note in pinned {
                let pos = note.position.as_ref();
                let size = note.size.as_ref();
                windows::create_floating_note_window(
                    &app_handle,
                    &note.id,
                    pos.map(|p| p.x),
                    pos.map(|p| p.y),
                    size.map(|s| s.width),
                    size.map(|s| s.height),
                );
            }

            // Show panel on launch
            if let Some(panel) = app.get_webview_window("panel") {
                show_panel(&panel, saved_panel_position, Position::Center);
            }

            // Tray icon click handler
            let tray = app.tray_by_id("main").expect("No tray icon found");
            let app_handle = app.handle().clone();
            tray.on_tray_icon_event(move |_tray, event| {
                // Feed tray position to positioner plugin
                tauri_plugin_positioner::on_tray_event(&app_handle, &event);

                if let TrayIconEvent::Click { button_state: MouseButtonState::Up, .. } = event {
                    if let Some(panel) = app_handle.get_webview_window("panel") {
                        if panel.is_visible().unwrap_or(false) {
                            let _ = panel.hide();
                        } else {
                            show_panel(&panel, get_saved_panel_position(&app_handle), Position::TrayCenter);
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
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let RunEvent::Reopen { .. } = event {
                if let Some(panel) = app.get_webview_window("panel") {
                    show_panel(&panel, get_saved_panel_position(app), Position::TrayCenter);
                }
            }
        });
}
