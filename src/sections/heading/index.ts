import './heading.css';
import type { SectionPlugin } from '../../types.js';
import { icon } from '../../utils/icons.js';
import { onPasteText } from '../../utils/clipboard.js';

export interface HeadingData extends Record<string, unknown> {
  level: 'h1' | 'h2' | 'h3';
  text: string;
  color?: string;
}

const COLORS: { value: string; label: string }[] = [
  { value: '',        label: 'Default' },
  { value: '#ef4444', label: 'Red'     },
  { value: '#f97316', label: 'Orange'  },
  { value: '#22c55e', label: 'Green'   },
  { value: '#3b82f6', label: 'Blue'    },
  { value: '#a855f7', label: 'Purple'  },
];

export const HeadingPlugin: SectionPlugin<HeadingData> = {
  typeId: 'heading',
  label: 'Heading',
  icon: icon('heading'),
  defaultData: { level: 'h2', text: '' },
  createEditor(_id, data, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'heading-editor';

    const levels = document.createElement('div');
    levels.className = 'heading-editor__levels';

    const levelBtns: HTMLButtonElement[] = [];
    (['h1', 'h2', 'h3'] as const).forEach((lvl) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'heading-editor__level-btn';
      btn.textContent = lvl.toUpperCase();
      btn.classList.toggle('is-active', data.level === lvl);
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onChange({ level: lvl });
        levelBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        input.className = `heading-editor__input heading-editor__input--${lvl}`;
      });
      levelBtns.push(btn);
      levels.appendChild(btn);
    });

    const sep = document.createElement('div');
    sep.className = 'heading-editor__sep';
    levels.appendChild(sep);

    const colorBtns: HTMLButtonElement[] = [];
    COLORS.forEach(({ value, label }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'heading-editor__color-btn';
      btn.title = label;
      btn.style.setProperty('--swatch', value || 'var(--color-text)');
      btn.classList.toggle('is-active', (data.color ?? '') === value);
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onChange({ color: value });
        colorBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        input.style.color = value || '';
      });
      colorBtns.push(btn);
      levels.appendChild(btn);
    });

    const input = document.createElement('div');
    input.contentEditable = 'true';
    input.className = `heading-editor__input heading-editor__input--${data.level}`;
    input.setAttribute('data-placeholder', 'Heading…');
    input.innerHTML = data.text;
    if (data.color) input.style.color = data.color;
    input.addEventListener('input', () => onChange({ text: input.innerHTML }));
    input.addEventListener('paste', onPasteText);

    wrapper.appendChild(levels);
    wrapper.appendChild(input);

    return {
      el: wrapper,
      focusTitle: () => input.focus(),
      update(d) {
        if (input.innerHTML !== d.text) input.innerHTML = d.text;
        if (input.className !== `heading-editor__input heading-editor__input--${d.level}`) {
          input.className = `heading-editor__input heading-editor__input--${d.level}`;
          levelBtns.forEach((b) => b.classList.toggle('is-active', b.textContent?.toLowerCase() === d.level));
        }
        const newColor = d.color ?? '';
        if (input.style.color !== newColor) {
          input.style.color = newColor;
          colorBtns.forEach((b) => b.classList.toggle('is-active', b.title === (COLORS.find(c => c.value === newColor)?.label ?? 'Default')));
        }
      },
    };
  },
};
