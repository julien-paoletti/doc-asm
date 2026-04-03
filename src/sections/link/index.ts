import './link.css';
import type { SectionPlugin } from '../../types.js';
import { icon } from '../../utils/icons.js';
import { onPasteText, makeCopyButton } from '../../utils/clipboard.js';
import { generateId } from '../../utils/id.js';

export interface LinkItem {
  id: string;
  url: string;
}

export interface LinkData extends Record<string, unknown> {
  items: LinkItem[];
}

export const LinkPlugin: SectionPlugin<LinkData> = {
  typeId: 'link',
  label: 'Links',
  icon: icon('link'),
  defaultData: { items: [] },

  createEditor(data, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'link-editor';

    let items: LinkItem[] = data.items.length
      ? data.items.map((i) => ({ ...i }))
      : [{ id: generateId(), url: '' }];

    function save(): void {
      onChange({ items: items.map((i) => ({ ...i })) });
    }

    function focusRow(rowIdx: number): void {
      const rows = wrapper.querySelectorAll<HTMLElement>('.link-editor__row');
      rows[rowIdx]?.querySelector<HTMLElement>('.link-editor__url')?.focus();
    }

    function renderRows(): void {
      wrapper.innerHTML = '';

      items.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'link-editor__row';

        const addRowAfter = (): void => {
          items.splice(idx + 1, 0, { id: generateId(), url: '' });
          save();
          renderRows();
          focusRow(idx + 1);
        };

        const removeRow = (): void => {
          if (items.length === 1) return;
          items.splice(idx, 1);
          save();
          renderRows();
          focusRow(Math.max(0, idx - 1));
        };

        const urlEl = document.createElement('div');
        urlEl.contentEditable = 'true';
        urlEl.className = 'link-editor__url';
        urlEl.setAttribute('data-placeholder', 'https://…');
        urlEl.setAttribute('spellcheck', 'false');
        urlEl.textContent = item.url;
        urlEl.addEventListener('input', () => {
          items[idx]!.url = urlEl.textContent ?? '';
          openBtn.href = items[idx]!.url || '#';
          save();
        });
        urlEl.addEventListener('paste', onPasteText);
        urlEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); addRowAfter(); }
          else if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); addRowAfter(); }
          else if (e.key === 'Backspace' && urlEl.textContent === '') { e.preventDefault(); removeRow(); }
        });

        const openBtn = document.createElement('a');
        openBtn.className = 'link-editor__open-btn';
        openBtn.title = 'Open link';
        openBtn.innerHTML = `${icon('link')} Open`;
        openBtn.href = item.url || '#';
        openBtn.target = '_blank';
        openBtn.rel = 'noopener noreferrer';

        const copyBtn = makeCopyButton(() => items[idx]!.url);
        copyBtn.className = 'link-editor__copy-btn';
        copyBtn.title = 'Copy URL';

        row.appendChild(urlEl);
        row.appendChild(copyBtn);
        row.appendChild(openBtn);
        wrapper.appendChild(row);
      });
    }

    renderRows();

    return {
      el: wrapper,
      focusTitle() {
        wrapper.querySelector<HTMLElement>('.link-editor__url')?.focus();
      },
      update(d) {
        items = d.items.length ? d.items.map((i) => ({ ...i })) : [{ id: generateId(), url: '' }];
        renderRows();
      },
    };
  },
};
