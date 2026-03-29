import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

let notes = [];

// SVG icon templates
const deleteIcon = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--icon-muted)" stroke-width="2" stroke-linecap="round">
  <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
</svg>`;

// Opacity slider
const slider = document.getElementById('opacity-slider');
const savedOpacity = localStorage.getItem('floaty-opacity') || '85';
slider.value = savedOpacity;

function applyOpacity() {
  invoke('set_window_opacity', { opacity: parseInt(slider.value) / 100 });
}
applyOpacity();

slider.addEventListener('input', () => {
  localStorage.setItem('floaty-opacity', slider.value);
  applyOpacity();
});

// Open a note as a floating window
async function openNote(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  if (!note.pinned) {
    await invoke('pin_note', { id });
  }
  await invoke('open_note_window', { id });
}

// Render
function renderNotes() {
  const list = document.getElementById('notes-list');

  if (notes.length === 0) {
    list.innerHTML = '<div class="empty-state">no notes yet</div>';
    return;
  }

  list.innerHTML = '';

  notes.forEach(note => {
    const item = document.createElement('div');
    item.className = 'note-item';

    // Display state
    const content = document.createElement('div');
    content.className = 'note-content';

    const lines = note.text.split('\n');
    const titleText = lines[0] || 'Untitled';

    const title = document.createElement('div');
    title.className = 'note-title';
    title.textContent = titleText;
    content.appendChild(title);

    if (lines.length > 1 && lines.slice(1).join('').trim()) {
      const preview = document.createElement('div');
      preview.className = 'note-preview';
      preview.textContent = lines.slice(1).join(' ').trim();
      content.appendChild(preview);
    }

    content.addEventListener('click', () => openNote(note.id));

    const actions = document.createElement('div');
    actions.className = 'note-actions';

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn';
    delBtn.title = 'Delete';
    delBtn.innerHTML = deleteIcon;
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      invoke('delete_note', { id: note.id });
    });

    // Open dot indicator
    const dot = document.createElement('div');
    dot.className = `pin-dot ${note.pinned ? 'active' : 'inactive'}`;

    actions.appendChild(delBtn);
    actions.appendChild(dot);

    item.appendChild(content);
    item.appendChild(actions);

    list.appendChild(item);
  });
}

// Listen for sync events
listen('notes-changed', event => {
  notes = event.payload;
  renderNotes();
});

// Add button — create and immediately open
document.getElementById('add-btn').addEventListener('click', async () => {
  const note = await invoke('create_note');
  await openNote(note.id);
});

const panelWindow = getCurrentWindow();
let lastPanelSize = { width: 0, height: 0 };
let lastPanelPosition = { x: 0, y: 0 };

setInterval(async () => {
  try {
    const scale = await panelWindow.scaleFactor();

    const size = await panelWindow.innerSize();
    const logicalW = size.width / scale;
    const logicalH = size.height / scale;

    if (logicalW !== lastPanelSize.width || logicalH !== lastPanelSize.height) {
      lastPanelSize = { width: logicalW, height: logicalH };
      invoke('update_panel_size', { width: logicalW, height: logicalH });
    }

    const pos = await panelWindow.outerPosition();
    const logicalX = pos.x / scale;
    const logicalY = pos.y / scale;

    if (logicalX !== lastPanelPosition.x || logicalY !== lastPanelPosition.y) {
      lastPanelPosition = { x: logicalX, y: logicalY };
      invoke('update_panel_position', { x: logicalX, y: logicalY });
    }
  } catch (_) {
    // Window may be closing
  }
}, 1000);

// Init
async function init() {
  notes = await invoke('get_all_notes');
  renderNotes();
}

init();
