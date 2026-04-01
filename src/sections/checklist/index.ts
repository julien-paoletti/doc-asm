import './checklist.css';
import type { SectionPlugin } from '../../types.js';
import { icon } from '../../utils/icons.js';
import { onPasteText } from '../../utils/clipboard.js';
import { generateId } from '../../utils/id.js';

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface ChecklistData extends Record<string, unknown> {
  items: ChecklistItem[];
}

export const ChecklistPlugin: SectionPlugin<ChecklistData> = {
  typeId: 'checklist',
  label: 'Checklist',
  icon: icon('checklist'),
  defaultData: { items: [] },

  createEditor(data, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'checklist-editor';

    let items: ChecklistItem[] = data.items.length
      ? data.items.map((i) => ({ ...i }))
      : [{ id: generateId(), text: '', checked: false }];

    function save(): void {
      onChange({ items: items.map((i) => ({ ...i })) });
    }

    function renderItems(): void {
      wrapper.innerHTML = '';

      items.forEach((item, idx) => {
        const row = document.createElement('label');
        row.className = 'checklist-editor__item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'checklist-editor__checkbox';
        checkbox.checked = item.checked;
        checkbox.addEventListener('change', () => {
          items[idx]!.checked = checkbox.checked;
          textEl.classList.toggle('checklist-editor__text--checked', checkbox.checked);
          save();
        });

        const textEl = document.createElement('div');
        textEl.contentEditable = 'true';
        textEl.className = 'checklist-editor__text';
        if (item.checked) textEl.classList.add('checklist-editor__text--checked');
        textEl.setAttribute('data-placeholder', 'Task…');
        textEl.setAttribute('spellcheck', 'true');
        textEl.textContent = item.text;

        textEl.addEventListener('input', () => {
          items[idx]!.text = textEl.textContent ?? '';
          save();
        });

        textEl.addEventListener('paste', onPasteText);

        textEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            items.splice(idx + 1, 0, { id: generateId(), text: '', checked: false });
            save();
            renderItems();
            wrapper.querySelectorAll<HTMLElement>('.checklist-editor__text')[idx + 1]?.focus();
          } else if (e.key === 'Backspace' && (textEl.textContent ?? '') === '' && items.length > 1) {
            e.preventDefault();
            items.splice(idx, 1);
            save();
            renderItems();
            wrapper.querySelectorAll<HTMLElement>('.checklist-editor__text')[Math.max(0, idx - 1)]?.focus();
          }
        });

        row.appendChild(checkbox);
        row.appendChild(textEl);
        wrapper.appendChild(row);
      });
    }

    renderItems();

    return {
      el: wrapper,
      focusTitle() {
        const first = wrapper.querySelector<HTMLElement>('.checklist-editor__text');
        first?.focus();
      },
    };
  },
};
