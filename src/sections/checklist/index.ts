import './checklist.css';
import type { SectionPlugin } from '../../types.js';
import { icon } from '../../utils/icons.js';
import { onPasteText } from '../../utils/clipboard.js';
import { generateId } from '../../utils/id.js';
import Sortable from 'sortablejs';

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  level?: number; // indent level 0–3
}

export interface ChecklistData extends Record<string, unknown> {
  items: ChecklistItem[];
}

// Returns the slice [idx, idx + groupSize) where groupSize includes idx and all
// immediately-following items whose level is deeper than items[idx].level.
function itemGroup(items: ChecklistItem[], idx: number): number {
  const parentLevel = items[idx]?.level ?? 0;
  let end = idx + 1;
  while (end < items.length && (items[end]?.level ?? 0) > parentLevel) end++;
  return end - idx;
}

// Sync a parent's checked state after one of its children changed.
// Walks up the hierarchy so cascading parents (grandparent, etc.) are also updated.
function syncParents(items: ChecklistItem[], changedIdx: number): void {
  let idx = changedIdx;
  while (idx > 0) {
    const childLevel = items[idx]?.level ?? 0;
    if (childLevel === 0) break;
    let parentIdx = -1;
    for (let i = idx - 1; i >= 0; i--) {
      if ((items[i]?.level ?? 0) < childLevel) { parentIdx = i; break; }
    }
    if (parentIdx === -1) break;
    const groupSize = itemGroup(items, parentIdx);
    const allDone = items.slice(parentIdx + 1, parentIdx + groupSize).every((it) => it.checked);
    items[parentIdx]!.checked = allDone;
    idx = parentIdx;
  }
}

// Move a group of `size` items starting at `from` to position `to` (in terms
// of the visual row index, before the group is removed).
function moveGroup(items: ChecklistItem[], from: number, size: number, to: number): ChecklistItem[] {
  const result = [...items];
  const group = result.splice(from, size);
  const insertAt = to > from ? to - size + 1 : to;
  result.splice(insertAt, 0, ...group);
  return result;
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

        // ── Drag handle ──────────────────────────────────────────────────
        const dragHandle = document.createElement('div');
        dragHandle.className = 'checklist-editor__drag-handle drag-handle';
        dragHandle.innerHTML = icon('gripVertical');

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
          void checkWrap.offsetWidth;
          checkWrap.classList.add('is-popping');
          syncParents(items, idx);
          // Update parent checkboxes in the DOM without a full re-render
          const allInputs = wrapper.querySelectorAll<HTMLInputElement>('.checklist-editor__checkbox-input');
          const allTexts = wrapper.querySelectorAll<HTMLElement>('.checklist-editor__text');
          items.forEach((it, i) => {
            const input = allInputs[i];
            const text = allTexts[i];
            if (input && input.checked !== it.checked) {
              input.checked = it.checked;
              text?.classList.toggle('checklist-editor__text--checked', it.checked);
            }
          });
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

        // ── Delete button ─────────────────────────────────────────────────
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'checklist-editor__delete-btn';
        deleteBtn.title = 'Delete task';
        deleteBtn.innerHTML = icon('trash');
        deleteBtn.addEventListener('click', () => {
          const size = itemGroup(items, idx);
          items.splice(idx, size);
          if (items.length === 0) items.push({ id: generateId(), text: '', checked: false, level: 0 });
          if (idx > 0) syncParents(items, Math.min(idx - 1, items.length - 1));
          save();
          renderItems();
          wrapper.querySelectorAll<HTMLElement>('.checklist-editor__text')[Math.max(0, idx - 1)]?.focus();
        });

        row.appendChild(dragHandle);
        row.appendChild(checkWrap);
        row.appendChild(textEl);
        row.appendChild(deleteBtn);
        wrapper.appendChild(row);
      });
    }

    renderItems();
    updateCounter();

    const sortable = Sortable.create(wrapper, {
      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      filter: '.checklist-editor__counter',
      preventOnFilter: false,
      onEnd(evt) {
        const from = evt.oldIndex;
        const to = evt.newIndex;
        if (from === undefined || to === undefined || from === to) return;
        const fromIdx = from - 1;
        const size = itemGroup(items, fromIdx);
        // SortableJS only moves the parent row; newIndex is relative to the full DOM
        // including children that stayed put. Clamp so toIdx can't land inside the group.
        const naiveToIdx = to - 1;
        const toIdx = naiveToIdx > fromIdx && naiveToIdx < fromIdx + size
          ? fromIdx + size - 1
          : naiveToIdx;
        if (toIdx !== fromIdx) {
          items = moveGroup(items, fromIdx, size, toIdx);
          save();
          // Defer re-render so SortableJS finishes its own DOM cleanup first,
          // otherwise it overwrites the correct positions of child rows.
          setTimeout(renderItems, 0);
        }
      },
    });

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
      destroy() {
        sortable.destroy();
      },
    };
  },
};
