import './text.css';
import type { SectionPlugin } from '../../types.js';
import { icon } from '../../utils/icons.js';
import { onPasteText } from '../../utils/clipboard.js';

export interface TextData extends Record<string, unknown> {
  content: string;
}

const TOOLBAR_COMMANDS: { cmd: string; label: string; title: string }[] = [
  { cmd: 'bold',                label: icon('bold'),          title: 'Bold (Ctrl+B)'        },
  { cmd: 'italic',              label: icon('italic'),        title: 'Italic (Ctrl+I)'      },
  { cmd: 'underline',           label: icon('underline'),     title: 'Underline (Ctrl+U)'   },
  { cmd: 'strikeThrough',       label: icon('strikethrough'), title: 'Strikethrough'         },
  { cmd: 'insertUnorderedList', label: icon('listBullet'),    title: 'Bullet list'          },
  { cmd: 'insertOrderedList',   label: icon('listNumbers'),   title: 'Numbered list'        },
];

export const TextPlugin: SectionPlugin<TextData> = {
  typeId: 'text',
  label: 'Text',
  icon: icon('article'),
  defaultData: { content: '' },
  createEditor(data, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'text-editor';

    const toolbar = document.createElement('div');
    toolbar.className = 'text-editor__toolbar';

    const area = document.createElement('div');
    area.contentEditable = 'true';
    area.className = 'text-editor__area';
    area.setAttribute('data-placeholder', 'Type your text…');
    area.innerHTML = data.content;
    area.addEventListener('input', () => onChange({ content: area.innerHTML }));
    area.addEventListener('paste', onPasteText);

    TOOLBAR_COMMANDS.forEach(({ cmd, label, title }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'text-editor__toolbar-btn';
      btn.innerHTML = label;
      btn.title = title;
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        document.execCommand(cmd, false);
        area.dispatchEvent(new Event('input'));
      });
      toolbar.appendChild(btn);
    });

    wrapper.appendChild(toolbar);
    wrapper.appendChild(area);

    return {
      el: wrapper,
      focusTitle: () => area.focus(),
      update(d) { if (area.innerHTML !== d.content) area.innerHTML = d.content; },
    };
  },
};
