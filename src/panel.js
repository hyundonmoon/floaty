const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

let notes = [];
let editingId = null;

// SVG icon templates
const pinIcon = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--icon-action)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 17v5"/><path d="M9 11V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7"/><path d="M5 11h14l-1.5 6h-11z"/>
</svg>`;

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

// Render
function renderNotes() {
  const list = document.getElementById('notes-list');

  if (notes.length === 0) {
    list.innerHTML = '<div class="empty-state">no notes yet</div>';
    return;
  }

  // Capture in-flight edit
  let editText = null;
  if (editingId) {
    const textarea = list.querySelector('.note-edit');
    if (textarea) editText = textarea.value;
  }

  list.innerHTML = '';

  notes.forEach(note => {
    const item = document.createElement('div');
    item.className = 'note-item';

    if (editingId === note.id) {
      // Editing state
      const textarea = document.createElement('textarea');
      textarea.className = 'note-edit';
      textarea.value = editText !== null ? editText : note.text;

      textarea.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          textarea.blur();
        }
      });

      textarea.addEventListener('blur', () => {
        const text = textarea.value;
        editingId = null;
        invoke('update_note', { id: note.id, text });
      });

      item.appendChild(textarea);

      // Focus after appending
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      });
    } else {
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

      content.addEventListener('click', () => {
        editingId = note.id;
        renderNotes();
      });

      const actions = document.createElement('div');
      actions.className = 'note-actions';

      // Pin button
      const pinBtn = document.createElement('button');
      pinBtn.className = 'icon-btn';
      pinBtn.title = note.pinned ? 'Unpin' : 'Pin';
      pinBtn.innerHTML = pinIcon;
      pinBtn.addEventListener('click', async e => {
        e.stopPropagation();
        if (note.pinned) {
          await invoke('unpin_note', { id: note.id });
        } else {
          await invoke('pin_note', { id: note.id });
          await invoke('open_note_window', { id: note.id });
        }
      });

      // Delete button
      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn';
      delBtn.title = 'Delete';
      delBtn.innerHTML = deleteIcon;
      delBtn.addEventListener('click', e => {
        e.stopPropagation();
        invoke('delete_note', { id: note.id });
      });

      // Pin dot
      const dot = document.createElement('div');
      dot.className = `pin-dot ${note.pinned ? 'active' : 'inactive'}`;

      actions.appendChild(pinBtn);
      actions.appendChild(delBtn);
      actions.appendChild(dot);

      item.appendChild(content);
      item.appendChild(actions);
    }

    list.appendChild(item);
  });
}

// Listen for sync events
listen('notes-changed', event => {
  notes = event.payload;
  renderNotes();
});

// Add button
document.getElementById('add-btn').addEventListener('click', async () => {
  const note = await invoke('create_note');
  editingId = note.id;
  notes = await invoke('get_all_notes');
  renderNotes();
});

// Init
async function init() {
  notes = await invoke('get_all_notes');
  renderNotes();
}

init();
