import type { CodeData } from './index.js';
import { onPasteText, makeCopyButton } from '../../utils/clipboard.js';
import { hljs, LANGUAGES } from './languages.js';

export function createCodeEditor(
  data: CodeData,
  onChange: (patch: Partial<CodeData>) => void
): { el: HTMLElement; focusTitle(): void } {
  const wrapper = document.createElement('div');
  wrapper.className = 'code-editor';

  // ── Header ────────────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'code-editor__header';

  const select = document.createElement('select');
  select.className = 'code-editor__lang-select';
  select.title = 'Langage';
  LANGUAGES.forEach(({ id, label }) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = label;
    opt.selected = id === data.language;
    select.appendChild(opt);
  });

  const filenameInput = document.createElement('div');
  filenameInput.contentEditable = 'true';
  filenameInput.className = 'code-editor__filename';
  filenameInput.setAttribute('data-placeholder', 'Nom du fichier…');
  filenameInput.textContent = data.filename;
  filenameInput.addEventListener('input', () => onChange({ filename: filenameInput.textContent ?? '' }));
  filenameInput.addEventListener('paste', onPasteText);
  filenameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); codeArea.focus(); }
  });

  const copyBtn = makeCopyButton(() => codeArea.textContent ?? '');
  copyBtn.className = 'code-editor__copy-btn';
  copyBtn.title = 'Copier le code';

  header.appendChild(select);
  header.appendChild(filenameInput);
  header.appendChild(copyBtn);

  // ── Code area ─────────────────────────────────────────────────────────────
  const pre = document.createElement('pre');
  pre.className = 'code-editor__pre';

  const codeArea = document.createElement('code');
  codeArea.contentEditable = 'true';
  codeArea.className = `code-editor__code language-${data.language}`;
  codeArea.setAttribute('spellcheck', 'false');
  codeArea.setAttribute('autocorrect', 'off');
  codeArea.setAttribute('autocapitalize', 'off');
  codeArea.setAttribute('data-placeholder', 'Saisissez votre code…');
  // Plain text avoids HTML injection from stored data
  codeArea.textContent = data.code;

  function highlight(): void {
    const text = codeArea.textContent ?? '';
    const result = hljs.highlight(text, { language: select.value, ignoreIllegals: true });

    const sel = window.getSelection();
    let caretOffset = 0;
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const preRange = document.createRange();
      preRange.selectNodeContents(codeArea);
      preRange.setEnd(range.startContainer, range.startOffset);
      caretOffset = preRange.toString().length;
    }

    codeArea.innerHTML = result.value;
    restoreCaret(codeArea, caretOffset);
  }

  function restoreCaret(el: HTMLElement, offset: number): void {
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    let remaining = offset;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      if (remaining <= node.length) {
        range.setStart(node, remaining);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      remaining -= node.length;
    }
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  let highlightTimer: ReturnType<typeof setTimeout> | null = null;
  function scheduleHighlight(): void {
    if (highlightTimer !== null) clearTimeout(highlightTimer);
    highlightTimer = setTimeout(() => { highlightTimer = null; highlight(); }, 200);
  }

  codeArea.addEventListener('input', () => {
    onChange({ code: codeArea.textContent ?? '' });
    scheduleHighlight();
  });

  codeArea.addEventListener('paste', onPasteText);

  codeArea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '  ');
    }
  });

  select.addEventListener('change', () => {
    codeArea.className = `code-editor__code language-${select.value}`;
    onChange({ language: select.value });
    highlight();
  });

  pre.appendChild(codeArea);
  wrapper.appendChild(header);
  wrapper.appendChild(pre);

  if (data.code) highlight();

  return { el: wrapper, focusTitle: () => filenameInput.focus() };
}
