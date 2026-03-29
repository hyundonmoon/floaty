# Open/Close Notes — Remove Pin Concept

## Problem

The panel has inline plain-text editing (textarea) that conflicts with rich text editing (Tiptap) in floating notes. Panel edits call `update_note` which clears the `content` field, destroying rich formatting. Various fixes created inconsistent UX (mixed read-only/editable, forced pinning on click). The root cause is two editing surfaces that save in incompatible ways, plus a "pinning" concept that adds unnecessary cognitive overhead.

## Solution

Remove the "pin" concept from the UI. Replace it with a simple "open/close" model:

- **Panel** is a list manager. Clicking a note opens it as a floating window. No inline editing.
- **Floating windows** are for reading and editing (Tiptap rich text). Closing the window closes the note.
- Notes that are open when the app quits reopen on next launch.

## Data Model

Keep the existing `pinned: bool` field on the `Note` struct for backward compatibility with existing `notes.json` files. The field now represents "is this note open as a floating window." No rename needed — it's an internal detail the user never sees.

Remove the `update_text` clearing of `content`. Since the panel no longer edits notes, `update_text` is only called from... actually, `update_text` / `update_note` are no longer called from anywhere (panel editing is removed). They can be kept for potential future use but the `content = None` clearing should be removed since it's the source of the original bug.

## Panel Changes

### Click behavior
- Clicking a note's content area opens it as a floating window (calls `open_note_window`)
- If the note is not already open (`pinned` is false), set it to open first
- If the note is already open, focus the existing floating window

### Remove inline editing
- Remove `editingId` state and all textarea editing code
- Remove `.note-edit` CSS (no longer used)

### Remove pin button
- Remove the pin/unpin toggle button from note actions
- Keep the delete button

### Open indicator
- The existing pin dot becomes an "open" indicator
- Active (green dot) = note has an open floating window
- Inactive (outline dot) = note is closed

### New note behavior
- "New note" button creates a note AND immediately opens it as a floating window
- No more inline textarea for new notes — the floating window with Tiptap is the editing surface

## Floating Note Changes

### Close button
- Currently calls `unpin_note` — this stays the same (sets `pinned = false`, closes window)
- No terminology change needed in the Rust code

### Everything else stays the same
- Tiptap editor, toolbar, save on blur via `update_note_content`
- Position/size tracking and persistence
- `notes-changed` sync
- Opacity, drag, resize

## Rust Changes

### `update_text` method
- Remove `self.notes[idx].content = None;` — panel no longer edits, and this line was the source of the formatting-destruction bug
- The method can remain available but should not destroy rich content

### Commands
- `pin_note` / `unpin_note` stay as-is (internal names, not user-facing)
- `update_note` stays as-is (may be used by future features)
- No new commands needed

## Startup / Restore

No changes. Existing logic restores notes where `pinned == true` on app launch — this continues to work, now meaning "restore notes that were open."

## Backward Compatibility

- Existing `notes.json` files work unchanged — `pinned: true` notes reopen as before
- `content` field has `#[serde(default)]` so old notes without it load fine
- Users who had pinned notes will see them as "open" notes — same behavior, different label

## What Gets Removed

- Panel inline textarea editing (the `editingId` system, `.note-edit` class, blur/save handler)
- Pin/unpin button in panel note actions
- The concept of "pinning" from the user's perspective
