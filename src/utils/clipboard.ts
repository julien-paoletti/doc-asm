import { icon } from './icons.js';

export function onPasteText(e: ClipboardEvent): void {
  e.preventDefault();
  document.execCommand('insertText', false, e.clipboardData?.getData('text/plain') ?? '');
}

export function makeCopyButton(getText: () => string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.innerHTML = icon('copy');
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(getText()).then(() => {
      btn.innerHTML = icon('check');
      btn.classList.add('is-copied');
      setTimeout(() => {
        btn.innerHTML = icon('copy');
        btn.classList.remove('is-copied');
      }, 1500);
    });
  });
  return btn;
}
