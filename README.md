# Floaty

A lightweight sticky notes app that lives in the system tray. Pin notes to float as always-on-top windows on your desktop.

Built with [Tauri v2](https://tauri.app/) (Rust backend, vanilla HTML/CSS/JS frontend).

## Features

- System tray icon — click to toggle the notes panel
- Create, edit, and delete notes from the panel
- Pin notes to float as always-on-top frameless windows on the desktop
- Inline editing in the panel (Enter to save, Shift+Enter for newline)
- Edit directly in floating note windows with live title bar updates
- Adjustable window opacity per note
- Pinned notes restore at their saved positions on app restart
- All windows stay in sync automatically

## Install

Download the latest `.dmg` from [Releases](https://github.com/hyundonmoon/floaty/releases), open it, and drag Floaty to Applications.

> **Note:** Since the app is not notarized, you may need to right-click > Open the first time to bypass Gatekeeper.

## Development

### Prerequisites

- [Rust](https://rustup.rs/) (1.80+)
- [Tauri CLI](https://tauri.app/start/): `cargo install tauri-cli`

### Run

```sh
cargo tauri dev
```

Frontend files (HTML/CSS/JS) auto-reload on change. Rust changes trigger a recompile and app restart.

### Build

```sh
# macOS .app bundle
cargo tauri build --bundles app

# macOS .dmg installer
cargo tauri build --bundles dmg
```

### Test

```sh
cd src-tauri && cargo test
```

## Architecture

- **`src/`** — Frontend (vanilla HTML/CSS/JS, no build step)
  - `panel.html` / `panel.js` — notes list panel
  - `note.html` / `note.js` — floating note window
  - `style.css` — Electric Mint color theme
- **`src-tauri/src/`** — Rust backend
  - `lib.rs` — app setup, system tray, window events
  - `commands.rs` — Tauri IPC command handlers
  - `notes.rs` — data model, JSON persistence, tests
  - `windows.rs` — floating window creation, native opacity

## License

[MIT](LICENSE)
