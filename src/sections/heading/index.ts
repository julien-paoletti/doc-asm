import './heading.css';
import type { SectionPlugin } from '../../types.js';
import { icon } from '../../utils/icons.js';
import { onPasteText } from '../../utils/clipboard.js';

export interface HeadingData extends Record<string, unknown> {
  level: 'h1' | 'h2' | 'h3';
  text: string;
}

export const HeadingPlugin: SectionPlugin<HeadingData> = {
  typeId: 'heading',
  label: 'Heading',
  icon: icon('heading'),
  defaultData: { level: 'h2', text: '' },
  createEditor(data, onChange) {
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

    const input = document.createElement('div');
    input.contentEditable = 'true';
    input.className = `heading-editor__input heading-editor__input--${data.level}`;
    input.setAttribute('data-placeholder', 'Heading…');
    input.innerHTML = data.text;
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
      },
    };
  },
};
