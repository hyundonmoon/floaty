# Floaty

A lightweight macOS sticky notes app. Lives in the system tray, notes can be pinned to float on the desktop. White base with fresh mint-green accents.

Built with [Tauri v2](https://tauri.app/) (Rust backend, vanilla HTML/CSS/JS frontend).

## Features

- System tray icon — click to toggle the notes panel
- Create, edit, and delete notes from the panel
- Pin notes to float as always-on-top frameless windows on the desktop
- Inline editing in the panel (Enter to save, Shift+Enter for newline)
- Edit directly in floating note windows with live title bar updates
- Adjustable window opacity via native `NSWindow.setAlphaValue`
- Pinned notes restore at their saved positions on app restart
- All windows stay in sync via a `notes-changed` event

## Prerequisites

- [Rust](https://rustup.rs/) (1.70+)
- [Tauri CLI](https://tauri.app/start/): `cargo install tauri-cli`

## Development

```sh
cargo tauri dev
```

Frontend files (HTML/CSS/JS) auto-reload on change. Rust changes trigger a recompile and app restart.

## Build

```sh
cargo tauri build --bundles app
```

Produces `Floaty.app` at `src-tauri/target/release/bundle/macos/Floaty.app`.

## Tests

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
