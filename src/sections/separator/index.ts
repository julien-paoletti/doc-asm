import './separator.css';
import type { SectionPlugin } from '../../types.js';
import { icon } from '../../utils/icons.js';

export type SeparatorStyle = 'line' | 'blank';
export type SeparatorSize  = 'sm' | 'md' | 'lg';

export interface SeparatorData extends Record<string, unknown> {
  style: SeparatorStyle;
  size: SeparatorSize;
}

const STYLES: { id: SeparatorStyle; label: string }[] = [
  { id: 'line',  label: '— Line'  },
  { id: 'blank', label: '␣ Space' },
];

const SIZES: { id: SeparatorSize; label: string }[] = [
  { id: 'sm', label: 'S' },
  { id: 'md', label: 'M' },
  { id: 'lg', label: 'L' },
];

function makeToggleGroup<T extends string>(
  options: { id: T; label: string }[],
  current: T,
  classPrefix: string,
  wrapper: HTMLElement,
  onSelect: (id: T) => void,
): HTMLButtonElement[] {
  const btns = options.map(({ id, label }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'separator-editor__btn';
    btn.textContent = label;
    if (id === current) btn.classList.add('is-active');
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      btns.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      options.forEach(({ id: oid }) => wrapper.classList.remove(`${classPrefix}${oid}`));
      wrapper.classList.add(`${classPrefix}${id}`);
      onSelect(id);
    });
    return btn;
  });
  return btns;
}

export const SeparatorPlugin: SectionPlugin<SeparatorData> = {
  typeId: 'separator',
  label: 'Separator',
  icon: icon('separator'),
  defaultData: { style: 'line', size: 'md' },

  createEditor(data, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = `separator-editor separator-editor--${data.style} separator-editor--${data.size}`;

    const controls = document.createElement('div');
    controls.className = 'separator-editor__controls';

    const styleBtns = makeToggleGroup(STYLES, data.style, 'separator-editor--', wrapper, (id) => onChange({ style: id }));
    const sizeBtns  = makeToggleGroup(SIZES,  data.size,  'separator-editor--', wrapper, (id) => onChange({ size: id }));

    const divider = document.createElement('span');
    divider.className = 'separator-editor__divider';

    styleBtns.forEach((b) => controls.appendChild(b));
    controls.appendChild(divider);
    sizeBtns.forEach((b) => controls.appendChild(b));

    const line = document.createElement('div');
    line.className = 'separator-editor__line';

    wrapper.appendChild(controls);
    wrapper.appendChild(line);

    return { el: wrapper };
  },
};
