import './checklist.css';
import type { SectionPlugin } from '../../types.js';
import { icon } from '../../utils/icons.js';
import { onPasteText } from '../../utils/clipboard.js';
import { generateId } from '../../utils/id.js';

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  level?: number; // indent level 0–3
}

export interface ChecklistData extends Record<string, unknown> {
  items: ChecklistItem[];
}

export const ChecklistPlugin: SectionPlugin<ChecklistData> = {
  typeId: 'checklist',
  label: 'Checklist',
  icon: icon('listCheck'),
  defaultData: { items: [] },

  createEditor(_id, data, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'checklist-editor';

    const counter = document.createElement('div');
    counter.className = 'checklist-editor__counter';
    wrapper.appendChild(counter);

    let items: ChecklistItem[] = data.items.length
      ? data.items.map((i) => ({ ...i }))
      : [{ id: generateId(), text: '', checked: false, level: 0 }];

    function updateCounter(): void {
      const done = items.filter((i) => i.checked).length;
      const total = items.length;
      counter.textContent = `${done} / ${total}`;
      counter.classList.toggle('checklist-editor__counter--all-done', done === total && total > 0);
    }

    function save(): void {
      onChange({ items: items.map((i) => ({ ...i })) });
      updateCounter();
    }

    function renderItems(): void {
      wrapper.innerHTML = '';
      wrapper.appendChild(counter);

      items.forEach((item, idx) => {
        const level = item.level ?? 0;

        const row = document.createElement('div');
        row.className = 'checklist-editor__item';
        row.style.paddingLeft = `${level * 24 + 4}px`;

        // ── Custom checkbox ──────────────────────────────────────────────
        const checkWrap = document.createElement('div');
        checkWrap.className = 'checklist-editor__checkbox-wrap';

        const checkInput = document.createElement('input');
        checkInput.type = 'checkbox';
        checkInput.className = 'checklist-editor__checkbox-input';
        checkInput.checked = item.checked;

        const checkBox = document.createElement('div');
        checkBox.className = 'checklist-editor__checkbox-box';

        const checkmark = document.createElement('div');
        checkmark.className = 'checklist-editor__checkmark';
        checkmark.innerHTML = icon('checkmark');

        checkWrap.appendChild(checkInput);
        checkWrap.appendChild(checkBox);
        checkWrap.appendChild(checkmark);

        // ── Text ─────────────────────────────────────────────────────────
        const textEl = document.createElement('div');
        textEl.className = 'checklist-editor__text-wrap';

        const textSpan = document.createElement('span');
        textSpan.contentEditable = 'true';
        textSpan.className = 'checklist-editor__text';
        if (item.checked) textSpan.classList.add('checklist-editor__text--checked');
        textSpan.setAttribute('data-placeholder', 'Task…');
        textSpan.setAttribute('spellcheck', 'true');
        textSpan.textContent = item.text;
        textEl.appendChild(textSpan);

        checkInput.addEventListener('change', () => {
          item.checked = checkInput.checked;
          textSpan.classList.toggle('checklist-editor__text--checked', checkInput.checked);
          checkWrap.classList.remove('is-popping');
          void checkWrap.offsetWidth; // force reflow to restart animation
          checkWrap.classList.add('is-popping');
          save();
        });

        textSpan.addEventListener('input', () => {
          item.text = textSpan.textContent ?? '';
          save();
        });

        textSpan.addEventListener('paste', onPasteText);

        textSpan.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            items.splice(idx + 1, 0, { id: generateId(), text: '', checked: false, level });
            save();
            renderItems();
            wrapper.querySelectorAll<HTMLElement>('.checklist-editor__text')[idx + 1]?.focus();
          } else if (e.key === 'Backspace' && (textSpan.textContent ?? '') === '' && items.length > 1) {
            e.preventDefault();
            items.splice(idx, 1);
            save();
            renderItems();
            wrapper.querySelectorAll<HTMLElement>('.checklist-editor__text')[Math.max(0, idx - 1)]?.focus();
          } else if (e.key === 'Tab') {
            e.preventDefault();
            item.level = e.shiftKey ? Math.max(0, level - 1) : Math.min(3, level + 1);
            save();
            renderItems();
            wrapper.querySelectorAll<HTMLElement>('.checklist-editor__text')[idx]?.focus();
          }
        });

        row.appendChild(checkWrap);
        row.appendChild(textEl);
        wrapper.appendChild(row);
      });
    }

    renderItems();
    updateCounter();

    return {
      el: wrapper,
      focusTitle() {
        wrapper.querySelector<HTMLElement>('.checklist-editor__text')?.focus();
      },
      update(d) {
        items = d.items.length ? d.items.map((i) => ({ ...i })) : [{ id: generateId(), text: '', checked: false, level: 0 }];
        renderItems();
        updateCounter();
      },
    };
  },
};
