import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

export function createEditor(element, { content, onUpdate, onBlur, onSelectionUpdate }) {
  return new Editor({
    element,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1] },
        link: {
          openOnClick: false,
          autolink: true,
        },
      }),
    ],
    content: content || '',
    onUpdate: onUpdate || undefined,
    onBlur: onBlur || undefined,
    onSelectionUpdate: onSelectionUpdate || undefined,
  });
}
