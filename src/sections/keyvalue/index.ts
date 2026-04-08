import './keyvalue.css';
import type { SectionPlugin } from '../../types.js';
import { icon } from '../../utils/icons.js';
import { onPasteText } from '../../utils/clipboard.js';
import { generateId } from '../../utils/id.js';
import { makeSortable } from '../../dnd/sortable.js';
import { moveArrayItem } from '../../utils/array.js';

export interface KVPair {
  id: string;
  key: string;
  value: string;
}

export interface KeyValueData extends Record<string, unknown> {
  pairs: KVPair[];
}

export const KeyValuePlugin: SectionPlugin<KeyValueData> = {
  typeId: 'keyvalue',
  label: 'Key-value',
  icon: icon('keyValue'),
  defaultData: { pairs: [] },

  createEditor(_id, data, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'kv-editor';

    let pairs: KVPair[] = data.pairs.length
      ? data.pairs.map((p) => ({ ...p }))
      : [{ id: generateId(), key: '', value: '' }];

    function save(): void {
      onChange({ pairs: pairs.map((p) => ({ ...p })) });
    }

    function makeCell(
      placeholder: string,
      className: string,
      value: string,
      onInput: (v: string) => void,
      onEnter: () => void,
      onBackspaceEmpty: () => void,
    ): HTMLElement {
      const el = document.createElement('div');
      el.contentEditable = 'true';
      el.className = className;
      el.setAttribute('data-placeholder', placeholder);
      el.setAttribute('spellcheck', 'false');
      el.textContent = value;
      el.addEventListener('input', () => onInput(el.textContent ?? ''));
      el.addEventListener('paste', onPasteText);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); onEnter(); }
        else if (e.key === 'Backspace' && (el.textContent ?? '') === '') { e.preventDefault(); onBackspaceEmpty(); }
      });
      return el;
    }

    function focusCell(rowIdx: number, col: 'key' | 'value'): void {
      const rows = wrapper.querySelectorAll<HTMLElement>('.kv-editor__row');
      const row = rows[rowIdx];
      if (!row) return;
      const el = row.querySelector<HTMLElement>(col === 'key' ? '.kv-editor__key' : '.kv-editor__value');
      el?.focus();
    }

    function renderRows(): void {
      wrapper.innerHTML = '';

      pairs.forEach((pair, idx) => {
        const row = document.createElement('div');
        row.className = 'kv-editor__row';

        const addRowAfter = (): void => {
          pairs.splice(idx + 1, 0, { id: generateId(), key: '', value: '' });
          save();
          renderRows();
          focusCell(idx + 1, 'key');
        };

        const removeRow = (): void => {
          if (pairs.length === 1) return;
          pairs.splice(idx, 1);
          save();
          renderRows();
          focusCell(Math.max(0, idx - 1), 'value');
        };

        const keyEl = makeCell(
          'Key',
          'kv-editor__key',
          pair.key,
          (v) => { pairs[idx]!.key = v; save(); },
          () => focusCell(idx, 'value'),
          removeRow,
        );

        const valueEl = makeCell(
          'Value',
          'kv-editor__value',
          pair.value,
          (v) => { pairs[idx]!.value = v; save(); },
          addRowAfter,
          removeRow,
        );

        keyEl.addEventListener('keydown', (e) => {
          if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); valueEl.focus(); }
        });
        valueEl.addEventListener('keydown', (e) => {
          if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            if (idx === pairs.length - 1) {
              pairs.push({ id: generateId(), key: '', value: '' });
              save();
              renderRows();
              focusCell(idx + 1, 'key');
            } else {
              focusCell(idx + 1, 'key');
            }
          } else if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            keyEl.focus();
          }
        });

        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle kv-editor__drag-handle';
        dragHandle.setAttribute('aria-label', 'Drag to reorder');
        dragHandle.innerHTML = icon('gripVertical');

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'kv-editor__delete-btn';
        deleteBtn.title = 'Delete row';
        deleteBtn.innerHTML = icon('x');
        deleteBtn.addEventListener('mousedown', (e) => { e.preventDefault(); removeRow(); });

        const controls = document.createElement('div');
        controls.className = 'kv-editor__row-controls';
        controls.appendChild(dragHandle);
        controls.appendChild(deleteBtn);

        row.appendChild(keyEl);
        row.appendChild(valueEl);
        row.appendChild(controls);
        wrapper.appendChild(row);
      });
    }

    renderRows();

    makeSortable({
      container: wrapper,
      onEnd(from, to) {
        pairs = moveArrayItem(pairs, from, to);
        save();
        renderRows();
      },
    });

    return {
      el: wrapper,
      focusTitle() {
        wrapper.querySelector<HTMLElement>('.kv-editor__key')?.focus();
      },
      update(d) {
        pairs = d.pairs.length ? d.pairs.map((p) => ({ ...p })) : [{ id: generateId(), key: '', value: '' }];
        renderRows();
      },
    };
  },
};
