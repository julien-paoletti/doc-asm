import './callout.css';
import type { SectionPlugin } from '../../types.js';
import { icon } from '../../utils/icons.js';
import { onPasteText } from '../../utils/clipboard.js';

export type CalloutVariant = 'info' | 'warning' | 'danger' | 'tip';

export interface CalloutData extends Record<string, unknown> {
  variant: CalloutVariant;
  title: string;
  body: string;
}

const VARIANTS: { id: CalloutVariant; label: string; iconName: 'calloutInfo' | 'calloutWarning' | 'calloutDanger' | 'calloutTip' }[] = [
  { id: 'info',    label: 'Info',        iconName: 'calloutInfo'    },
  { id: 'warning', label: 'Warning',       iconName: 'calloutWarning' },
  { id: 'danger',  label: 'Danger',      iconName: 'calloutDanger'  },
  { id: 'tip',     label: 'Tip',         iconName: 'calloutTip'     },
];

export const CalloutPlugin: SectionPlugin<CalloutData> = {
  typeId: 'callout',
  label: 'Callout',
  icon: icon('callout'),
  defaultData: { variant: 'info', title: '', body: '' },

  createEditor(_id, data, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = `callout-editor callout-editor--${data.variant}`;

    const picker = document.createElement('div');
    picker.className = 'callout-editor__picker';

    VARIANTS.forEach(({ id, label, iconName }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'callout-editor__variant-btn';
      btn.title = label;
      btn.innerHTML = icon(iconName);
      if (id === data.variant) btn.classList.add('is-active');
      btn.addEventListener('click', () => {
        VARIANTS.forEach((v) => wrapper.classList.remove(`callout-editor--${v.id}`));
        wrapper.classList.add(`callout-editor--${id}`);
        picker.querySelectorAll('.callout-editor__variant-btn').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        iconEl.innerHTML = icon(iconName);
        activeVariant = VARIANTS.find((v) => v.id === id)!;
        onChange({ variant: id });
      });
      picker.appendChild(btn);
    });

    let activeVariant = VARIANTS.find((v) => v.id === data.variant)!;

    const iconEl = document.createElement('div');
    iconEl.className = 'callout-editor__icon';
    iconEl.innerHTML = icon(activeVariant.iconName);

    const content = document.createElement('div');
    content.className = 'callout-editor__content';

    const titleEl = document.createElement('div');
    titleEl.contentEditable = 'true';
    titleEl.className = 'callout-editor__title';
    titleEl.setAttribute('data-placeholder', 'Title…');
    titleEl.textContent = data.title;
    titleEl.addEventListener('input', () => onChange({ title: titleEl.textContent ?? '' }));
    titleEl.addEventListener('paste', onPasteText);
    titleEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); bodyEl.focus(); }
    });

    const bodyEl = document.createElement('div');
    bodyEl.contentEditable = 'true';
    bodyEl.className = 'callout-editor__body';
    bodyEl.setAttribute('data-placeholder', 'Description…');
    bodyEl.innerHTML = data.body;
    bodyEl.addEventListener('input', () => onChange({ body: bodyEl.innerHTML }));
    bodyEl.addEventListener('paste', onPasteText);

    content.appendChild(titleEl);
    content.appendChild(bodyEl);

    const main = document.createElement('div');
    main.className = 'callout-editor__main';
    main.appendChild(iconEl);
    main.appendChild(content);

    wrapper.appendChild(picker);
    wrapper.appendChild(main);

    return {
      el: wrapper,
      focusTitle: () => titleEl.focus(),
      update(d) {
        if (titleEl.textContent !== d.title) titleEl.textContent = d.title;
        if (bodyEl.innerHTML !== d.body) bodyEl.innerHTML = d.body;
        if (d.variant !== activeVariant.id) {
          activeVariant = VARIANTS.find((x) => x.id === d.variant)!;
          VARIANTS.forEach((x) => wrapper.classList.remove(`callout-editor--${x.id}`));
          wrapper.classList.add(`callout-editor--${d.variant}`);
          iconEl.innerHTML = icon(activeVariant.iconName);
          picker.querySelectorAll('.callout-editor__variant-btn').forEach((b, i) => {
            b.classList.toggle('is-active', VARIANTS[i]?.id === d.variant);
          });
        }
      },
    };
  },
};
