const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const { getCurrentWindow } = window.__TAURI__.window;

const currentWindow = getCurrentWindow();
const noteId = new URLSearchParams(window.location.search).get('id');

const titleText = document.querySelector('.note-titlebar-text');
const textarea = document.getElementById('note-textarea');
const closeBtn = document.getElementById('close-btn');

let lastSavedText = '';
let lastPosition = { x: 0, y: 0 };

function updateDisplay(note) {
  if (!note) return;

  // Update title bar
  const firstLine = note.text.split('\n')[0] || 'Note';
  titleText.textContent = firstLine;

  // Update textarea only if not focused (avoid overwriting while typing)
  if (document.activeElement !== textarea) {
    textarea.value = note.text;
    lastSavedText = note.text;
  }
}

// Save on blur (only if changed)
textarea.addEventListener('blur', () => {
  if (textarea.value !== lastSavedText) {
    lastSavedText = textarea.value;
    invoke('update_note', { id: noteId, text: textarea.value });
  }
});

// Update title bar live as user types
textarea.addEventListener('input', () => {
  const firstLine = textarea.value.split('\n')[0] || 'Note';
  titleText.textContent = firstLine;
});

// Close button → unpin note
closeBtn.addEventListener('click', () => {
  // Save any unsaved text first
  if (textarea.value !== lastSavedText) {
    invoke('update_note', { id: noteId, text: textarea.value });
  }
  invoke('unpin_note', { id: noteId });
});

// Listen for sync events
listen('notes-changed', event => {
  const notes = event.payload;
  const note = notes.find(n => n.id === noteId);
  if (note) {
    updateDisplay(note);
  }
});

// Position tracking: poll every 1s
setInterval(async () => {
  try {
    const pos = await currentWindow.outerPosition();
    const scale = await currentWindow.scaleFactor();
    const logicalX = pos.x / scale;
    const logicalY = pos.y / scale;

    if (logicalX !== lastPosition.x || logicalY !== lastPosition.y) {
      lastPosition = { x: logicalX, y: logicalY };
      invoke('update_position', { id: noteId, x: logicalX, y: logicalY });
    }
  } catch (_) {
    // Window may be closing
  }
}, 1000);

// Save before window close
window.addEventListener('beforeunload', () => {
  if (textarea.value !== lastSavedText) {
    invoke('update_note', { id: noteId, text: textarea.value });
  }
});

// Init
async function init() {
  const notes = await invoke('get_all_notes');
  const note = notes.find(n => n.id === noteId);
  if (note) {
    updateDisplay(note);
    lastSavedText = note.text;
  }
}

init();
