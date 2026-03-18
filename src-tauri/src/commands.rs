use crate::notes::{Note, NoteStore};
use crate::preferences::PreferencesStore;
use crate::windows;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

pub type NoteStoreState = Mutex<NoteStore>;
pub type PreferencesState = Mutex<PreferencesStore>;

fn emit_notes_changed(app: &AppHandle, store: &NoteStore) {
    let notes = store.get_all();
    let _ = app.emit("notes-changed", notes);
}

#[tauri::command]
pub fn get_all_notes(state: State<'_, NoteStoreState>) -> Vec<Note> {
    let store = state.lock().unwrap();
    store.get_all()
}

#[tauri::command]
pub fn create_note(app: AppHandle, state: State<'_, NoteStoreState>) -> Note {
    let mut store = state.lock().unwrap();
    let note = store.create();
    emit_notes_changed(&app, &store);
    note
}

#[tauri::command]
pub fn update_note(
    app: AppHandle,
    state: State<'_, NoteStoreState>,
    id: String,
    text: String,
) -> Option<Note> {
    let mut store = state.lock().unwrap();
    let result = store.update_text(&id, &text);
    emit_notes_changed(&app, &store);
    result
}

#[tauri::command]
pub fn delete_note(app: AppHandle, state: State<'_, NoteStoreState>, id: String) {
    let mut store = state.lock().unwrap();
    // Check if pinned, close floating window
    let was_pinned = store.get_all().iter().any(|n| n.id == id && n.pinned);
    store.delete(&id);
    if was_pinned {
        let label = format!("note-{}", id);
        if let Some(window) = app.get_webview_window(&label) {
            let _ = window.close();
        }
    }
    emit_notes_changed(&app, &store);
}

#[tauri::command]
pub fn pin_note(app: AppHandle, state: State<'_, NoteStoreState>, id: String) {
    let mut store = state.lock().unwrap();
    store.set_pinned(&id, true);
    emit_notes_changed(&app, &store);
}

#[tauri::command]
pub fn unpin_note(app: AppHandle, state: State<'_, NoteStoreState>, id: String) {
    let mut store = state.lock().unwrap();
    store.set_pinned(&id, false);
    let label = format!("note-{}", id);
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.close();
    }
    emit_notes_changed(&app, &store);
}

#[tauri::command]
pub fn update_position(state: State<'_, NoteStoreState>, id: String, x: f64, y: f64) {
    let mut store = state.lock().unwrap();
    store.update_position(&id, x, y);
}

#[tauri::command]
pub fn update_size(state: State<'_, NoteStoreState>, id: String, width: f64, height: f64) {
    let mut store = state.lock().unwrap();
    store.update_size(&id, width, height);
}

#[tauri::command]
pub fn open_note_window(app: AppHandle, state: State<'_, NoteStoreState>, id: String) {
    let store = state.lock().unwrap();
    if let Some(note) = store.get_all().into_iter().find(|n| n.id == id) {
        let pos = note.position.as_ref();
        let size = note.size.as_ref();
        drop(store);
        windows::create_floating_note_window(
            &app,
            &id,
            pos.map(|p| p.x),
            pos.map(|p| p.y),
            size.map(|s| s.width),
            size.map(|s| s.height),
        );
    }
}

#[tauri::command]
pub fn update_panel_size(state: State<'_, PreferencesState>, width: f64, height: f64) {
    let mut prefs = state.lock().unwrap();
    prefs.set_panel_size(width, height);
}

#[tauri::command]
pub fn update_panel_position(state: State<'_, PreferencesState>, x: f64, y: f64) {
    let mut prefs = state.lock().unwrap();
    prefs.set_panel_position(x, y);
}
