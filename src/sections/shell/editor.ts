import type { ShellData } from './index.js';
import { icon } from '../../utils/icons.js';
import { onPasteText, makeCopyButton } from '../../utils/clipboard.js';

export function createShellEditor(
  data: ShellData,
  onChange: (patch: Partial<ShellData>) => void
): { el: HTMLElement; focusTitle(): void } {
  const wrapper = document.createElement('div');
  wrapper.className = 'shell-editor';

  const header = document.createElement('div');
  header.className = 'shell-editor__header';

  const termIcon = document.createElement('span');
  termIcon.className = 'shell-editor__term-icon';
  termIcon.innerHTML = icon('terminal');

  const labelInput = document.createElement('div');
  labelInput.contentEditable = 'true';
  labelInput.className = 'shell-editor__label';
  labelInput.setAttribute('data-placeholder', 'Description…');
  labelInput.innerHTML = data.label;
  labelInput.addEventListener('input', () => onChange({ label: labelInput.innerHTML }));
  labelInput.addEventListener('paste', onPasteText);
  labelInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); commandArea.focus(); }
  });

  const copyBtn = makeCopyButton(() => commandArea.textContent ?? '');
  copyBtn.className = 'shell-editor__copy-btn';
  copyBtn.title = 'Copy command';

  header.appendChild(termIcon);
  header.appendChild(labelInput);

  const prompt = document.createElement('span');
  prompt.className = 'shell-editor__prompt';
  prompt.textContent = '$';
  prompt.setAttribute('aria-hidden', 'true');

  const commandArea = document.createElement('div');
  commandArea.contentEditable = 'true';
  commandArea.className = 'shell-editor__command';
  commandArea.setAttribute('data-placeholder', 'command…');
  commandArea.setAttribute('spellcheck', 'false');
  commandArea.setAttribute('autocorrect', 'off');
  commandArea.innerHTML = data.command;
  commandArea.addEventListener('input', () => onChange({ command: commandArea.textContent ?? '' }));
  commandArea.addEventListener('paste', onPasteText);
  // Prevent newlines — a shell command is a single line
  commandArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') e.preventDefault();
  });

  const commandRow = document.createElement('div');
  commandRow.className = 'shell-editor__command-row';
  commandRow.appendChild(prompt);
  commandRow.appendChild(commandArea);

  wrapper.appendChild(header);
  wrapper.appendChild(commandRow);
  wrapper.appendChild(copyBtn);

  return { el: wrapper, focusTitle: () => labelInput.focus() };
}
