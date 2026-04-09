import './text.css';
import type { SectionPlugin } from '../../types.js';
import { icon } from '../../utils/icons.js';
import { onPasteText } from '../../utils/clipboard.js';

export interface TextData extends Record<string, unknown> {
  content: string;
}

type ToolbarCommand =
  | { cmd: string; label: string; title: string }
  | { handler: (area: HTMLElement) => void; label: string; title: string };

type ToolbarEntry = ToolbarCommand | 'sep';

const TOOLBAR_COMMANDS: ToolbarEntry[] = [
  { cmd: 'bold',                label: icon('bold'),          title: 'Bold (Ctrl+B)'     },
  { cmd: 'italic',              label: icon('italic'),        title: 'Italic (Ctrl+I)'   },
  { cmd: 'underline',           label: icon('underline'),     title: 'Underline (Ctrl+U)'},
  { cmd: 'strikeThrough',       label: icon('strikethrough'), title: 'Strikethrough'      },
  'sep',
  { cmd: 'insertUnorderedList', label: icon('listBullet'),    title: 'Bullet list'       },
  { cmd: 'insertOrderedList',   label: icon('listNumbers'),   title: 'Numbered list'     },
  'sep',
  { handler: toggleInlineCode,  label: icon('code'),          title: 'Inline code'       },
];

const ACTIVE_CMDS = ['bold', 'italic', 'underline', 'strikeThrough'] as const;

function anchorElement(node: Node): Element | null {
  return node.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element;
}

function toggleInlineCode(area: HTMLElement): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const codeEl = anchorElement(range.commonAncestorContainer)?.closest('code');
  if (codeEl) {
    const text = document.createTextNode(codeEl.textContent ?? '');
    codeEl.replaceWith(text);
    const newRange = document.createRange();
    newRange.selectNode(text);
    sel.removeAllRanges();
    sel.addRange(newRange);
  } else {
    if (range.collapsed) return;
    const code = document.createElement('code');
    range.surroundContents(code);
  }
  area.dispatchEvent(new Event('input'));
}

function buildToolbar(
  entries: ToolbarEntry[],
  area: HTMLElement,
): { el: HTMLElement; cmdBtnMap: Map<string, HTMLButtonElement> } {
  const el = document.createElement('div');
  const cmdBtnMap = new Map<string, HTMLButtonElement>();

  entries.forEach((entry) => {
    if (entry === 'sep') {
      const sep = document.createElement('div');
      sep.className = 'text-editor__toolbar-sep';
      el.appendChild(sep);
      return;
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'text-editor__toolbar-btn';
    btn.innerHTML = entry.label;
    btn.title = entry.title;
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if ('handler' in entry) {
        entry.handler(area);
      } else {
        document.execCommand(entry.cmd, false);
        area.dispatchEvent(new Event('input'));
      }
    });
    if ('cmd' in entry) cmdBtnMap.set(entry.cmd, btn);
    el.appendChild(btn);
  });

  return { el, cmdBtnMap };
}

export const TextPlugin: SectionPlugin<TextData> = {
  typeId: 'text',
  label: 'Text',
  icon: icon('article'),
  defaultData: { content: '' },
  createEditor(_id, data, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'text-editor';

    // ── Editable area ────────────────────────────────────────────────────────
    const area = document.createElement('div');

    // ── Fixed toolbar ────────────────────────────────────────────────────────
    const { el: toolbarEl, cmdBtnMap } = buildToolbar(TOOLBAR_COMMANDS, area);
    toolbarEl.className = 'text-editor__toolbar';
    area.contentEditable = 'true';
    area.className = 'text-editor__area';
    area.setAttribute('data-placeholder', 'Type your text…');
    area.innerHTML = data.content;
    area.addEventListener('input', () => onChange({ content: area.innerHTML }));
    area.addEventListener('paste', onPasteText);
    area.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const inList = anchorElement(sel.getRangeAt(0).commonAncestorContainer)?.closest('li');
      if (!inList) return;
      e.preventDefault();
      document.execCommand(e.shiftKey ? 'outdent' : 'indent', false);
      area.dispatchEvent(new Event('input'));
    });

    // ── Floating toolbar ─────────────────────────────────────────────────────
    const { el: floatEl, cmdBtnMap: floatCmdBtnMap } = buildToolbar(TOOLBAR_COMMANDS, area);
    floatEl.className = 'text-editor__float';
    floatEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(floatEl);

    function updateActiveStates(btnMap: Map<string, HTMLButtonElement>): void {
      ACTIVE_CMDS.forEach((cmd) => {
        btnMap.get(cmd)?.classList.toggle('is-active', document.queryCommandState(cmd));
      });
    }

    function positionFloat(): void {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !area.contains(sel.anchorNode)) {
        floatEl.classList.remove('is-visible');
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      const fw = floatEl.offsetWidth;
      const left = Math.max(8, Math.min(rect.left + rect.width / 2 - fw / 2, window.innerWidth - fw - 8));
      floatEl.style.left = `${left + window.scrollX}px`;
      floatEl.style.top = `${rect.top + window.scrollY - floatEl.offsetHeight - 8}px`;
      floatEl.classList.add('is-visible');
      updateActiveStates(floatCmdBtnMap);
    }

    const onSelectionChange = (): void => {
      updateActiveStates(cmdBtnMap);
      positionFloat();
    };

    document.addEventListener('selectionchange', onSelectionChange);

    wrapper.appendChild(toolbarEl);
    wrapper.appendChild(area);

    return {
      el: wrapper,
      focusTitle: () => area.focus(),
      update(d) { if (area.innerHTML !== d.content) area.innerHTML = d.content; },
      destroy() {
        document.removeEventListener('selectionchange', onSelectionChange);
        floatEl.remove();
      },
    };
  },
};
