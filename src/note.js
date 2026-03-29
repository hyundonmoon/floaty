import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { createEditor } from './editor.js';

const currentWindow = getCurrentWindow();
const noteId = new URLSearchParams(window.location.search).get('id');

const titleText = document.querySelector('.note-titlebar-text');
const editorEl = document.getElementById('editor');
const toolbar = document.getElementById('toolbar');
const closeBtn = document.getElementById('close-btn');

let lastPosition = { x: 0, y: 0 };
let lastSize = { width: 0, height: 0 };
let lastSavedHtml = '';
let editor = null;

// Convert legacy plain text to HTML paragraphs
function plainTextToHtml(text) {
  if (!text) return '<p></p>';
  return text
    .split('\n')
    .map(line => `<p>${line || '<br>'}</p>`)
    .join('');
}

function updateTitleFromEditor() {
  const text = editor.getText();
  const firstLine = text.split('\n')[0] || 'Note';
  titleText.textContent = firstLine;
}

function saveContent() {
  if (!editor) return;
  const html = editor.getHTML();
  if (html === lastSavedHtml) return;
  lastSavedHtml = html;
  const text = editor.getText();
  invoke('update_note_content', { id: noteId, content: html, text });
}

// Toolbar: event delegation
toolbar.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn || !editor) return;

  const action = btn.dataset.action;
  const chain = editor.chain().focus();

  switch (action) {
    case 'bold':
      chain.toggleBold().run();
      break;
    case 'italic':
      chain.toggleItalic().run();
      break;
    case 'strike':
      chain.toggleStrike().run();
      break;
    case 'heading':
      chain.toggleHeading({ level: 1 }).run();
      break;
    case 'bulletList':
      chain.toggleBulletList().run();
      break;
    case 'orderedList':
      chain.toggleOrderedList().run();
      break;
    case 'link': {
      if (editor.isActive('link')) {
        chain.unsetLink().run();
      } else {
        const url = prompt('Enter URL:');
        if (url) {
          chain.setLink({ href: url }).run();
        }
      }
      break;
    }
  }
});

// Update active states on toolbar buttons
function updateToolbarState() {
  if (!editor) return;
  toolbar.querySelectorAll('button[data-action]').forEach(btn => {
    const action = btn.dataset.action;
    let active = false;
    switch (action) {
      case 'bold': active = editor.isActive('bold'); break;
      case 'italic': active = editor.isActive('italic'); break;
      case 'strike': active = editor.isActive('strike'); break;
      case 'heading': active = editor.isActive('heading', { level: 1 }); break;
      case 'bulletList': active = editor.isActive('bulletList'); break;
      case 'orderedList': active = editor.isActive('orderedList'); break;
      case 'link': active = editor.isActive('link'); break;
    }
    btn.classList.toggle('is-active', active);
  });
}

// Handle link clicks inside editor
editorEl.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (link) {
    e.preventDefault();
    const url = link.getAttribute('href');
    if (url) invoke('open_url', { url });
  }
});

// Close button → unpin note
closeBtn.addEventListener('click', () => {
  saveContent();
  invoke('unpin_note', { id: noteId });
});

// Listen for sync events — update if not focused
listen('notes-changed', event => {
  const notes = event.payload;
  const note = notes.find(n => n.id === noteId);
  if (note && editor && !editor.isFocused) {
    const html = note.content || plainTextToHtml(note.text);
    if (html !== editor.getHTML()) {
      editor.commands.setContent(html);
      lastSavedHtml = editor.getHTML();
    }
    const firstLine = note.text.split('\n')[0] || 'Note';
    titleText.textContent = firstLine;
  }
});

// Position & size tracking
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
  saveContent();
});

// Init
async function init() {
  const notes = await invoke('get_all_notes');
  const note = notes.find(n => n.id === noteId);

  let initialContent = '<p></p>';
  if (note) {
    initialContent = note.content || plainTextToHtml(note.text);
    const firstLine = note.text.split('\n')[0] || 'Note';
    titleText.textContent = firstLine;
  }

  editor = createEditor(editorEl, {
    content: initialContent,
    onUpdate: () => {
      updateTitleFromEditor();
      updateToolbarState();
    },
    onBlur: () => {
      saveContent();
    },
    onSelectionUpdate: () => {
      updateToolbarState();
    },
  });

  lastSavedHtml = editor.getHTML();
}

init();
