const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const { getCurrentWindow } = window.__TAURI__.window;

const currentWindow = getCurrentWindow();
const noteId = new URLSearchParams(window.location.search).get('id');

const titleText = document.querySelector('.note-titlebar-text');
const textarea = document.getElementById('note-textarea');
const noteBody = document.querySelector('.note-body');
const closeBtn = document.getElementById('close-btn');

let lastSavedText = '';
let lastPosition = { x: 0, y: 0 };
let lastSize = { width: 0, height: 0 };
let editing = false;

// URL regex for linkifying text
const urlRegex = /(https?:\/\/[^\s<]+)/g;

function renderDisplayView(text) {
  const display = document.createElement('div');
  display.className = 'note-display';

  if (!text) {
    display.textContent = '';
    return display;
  }

  // Split text into lines, linkify URLs within each line
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    let lastIndex = 0;
    let match;
    urlRegex.lastIndex = 0;

    while ((match = urlRegex.exec(line)) !== null) {
      // Add text before the URL
      if (match.index > lastIndex) {
        display.appendChild(document.createTextNode(line.slice(lastIndex, match.index)));
      }
      // Add clickable link
      const url = match[0];
      const link = document.createElement('a');
      link.href = '#';
      link.className = 'note-link';
      link.textContent = url;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        invoke('open_url', { url });
      });
      display.appendChild(link);
      lastIndex = urlRegex.lastIndex;
    }
    // Remaining text after last URL
    if (lastIndex < line.length) {
      display.appendChild(document.createTextNode(line.slice(lastIndex)));
    }
    if (i < lines.length - 1) {
      display.appendChild(document.createElement('br'));
    }
  });

  return display;
}

function showDisplayMode() {
  editing = false;
  textarea.style.display = 'none';
  // Remove old display view
  const old = noteBody.querySelector('.note-display');
  if (old) old.remove();

  const display = renderDisplayView(textarea.value);
  display.addEventListener('click', (e) => {
    if (e.target.classList.contains('note-link')) return;
    showEditMode();
  });
  noteBody.appendChild(display);
}

function showEditMode() {
  editing = true;
  const display = noteBody.querySelector('.note-display');
  if (display) display.remove();
  textarea.style.display = '';
  textarea.focus();
}

function updateDisplay(note) {
  if (!note) return;

  const firstLine = note.text.split('\n')[0] || 'Note';
  titleText.textContent = firstLine;

  if (!editing) {
    textarea.value = note.text;
    lastSavedText = note.text;
    showDisplayMode();
  }
}

// Save on blur, switch to display mode
textarea.addEventListener('blur', () => {
  if (textarea.value !== lastSavedText) {
    lastSavedText = textarea.value;
    invoke('update_note', { id: noteId, text: textarea.value });
  }
  showDisplayMode();
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

    const size = await currentWindow.innerSize();
    const logicalW = size.width / scale;
    const logicalH = size.height / scale;

    if (logicalW !== lastSize.width || logicalH !== lastSize.height) {
      lastSize = { width: logicalW, height: logicalH };
      invoke('update_size', { id: noteId, width: logicalW, height: logicalH });
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
