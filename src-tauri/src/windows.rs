use cocoa::appkit::NSWindow;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
pub fn set_window_opacity(window: tauri::WebviewWindow, opacity: f64) {
    #[cfg(target_os = "macos")]
    unsafe {
        let ns_window: cocoa::base::id = window.ns_window().unwrap() as cocoa::base::id;
        ns_window.setAlphaValue_(opacity);
    }
}

pub fn create_floating_note_window(app: &AppHandle, note_id: &str, x: Option<f64>, y: Option<f64>) {
    let label = format!("note-{}", note_id);

    // Skip if window already exists
    if app.get_webview_window(&label).is_some() {
        return;
    }

    let url = format!("note.html?id={}", note_id);
    let mut builder = WebviewWindowBuilder::new(app, &label, WebviewUrl::App(url.into()))
        .title("Floaty Note")
        .inner_size(220.0, 180.0)
        .resizable(false)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .always_on_top(true)
        .visible(true);

    if let (Some(x), Some(y)) = (x, y) {
        builder = builder.position(x, y);
    }

    let _ = builder.build();
}
