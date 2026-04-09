import './search.css';
import type { AppState, Section } from '../types.js';
import { icon } from '../utils/icons.js';
import { escapeHtml, stripHtml } from '../utils/html.js';

interface SearchResult {
  documentId: string;
  documentTitle: string;
  sectionId: string;
  sectionType: string;
  snippet: string;
  matchStart: number;
  matchLength: number;
}

const SNIPPET_PAD = 50;

const SECTION_LABELS: Record<string, string> = {
  heading: 'Heading', text: 'Text', code: 'Code', shell: 'Shell',
  callout: 'Callout', checklist: 'Checklist', keyvalue: 'Key-Value',
  link: 'Links', image: 'Image', separator: 'Separator', archie: 'Diagram',
  title: 'Document title',
};

function extractText(section: Section): string {
  const d = section.data;
  switch (section.type) {
    case 'heading':   return stripHtml((d['text'] as string) ?? '');
    case 'text':      return stripHtml((d['content'] as string) ?? '');
    case 'code':      return [(d['filename'] as string) ?? '', (d['code'] as string) ?? ''].filter(Boolean).join(' ');
    case 'shell':     return [(d['label'] as string) ?? '', (d['command'] as string) ?? ''].filter(Boolean).join(' ');
    case 'callout':   return [stripHtml((d['title'] as string) ?? ''), stripHtml((d['body'] as string) ?? '')].filter(Boolean).join(' ');
    case 'checklist': return ((d['items'] as { text: string }[]) ?? []).map((i) => i.text).join(' ');
    case 'keyvalue':  return ((d['pairs'] as { key: string; value: string }[]) ?? []).map((p) => `${p.key} ${p.value}`).join(' ');
    case 'link':      return ((d['items'] as { url: string; label?: string }[]) ?? []).map((i) => i.label ?? i.url).join(' ');
    default:          return '';
  }
}

function runSearch(state: AppState, query: string): SearchResult[] {
  if (!query.trim()) return [];
  const lower = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const doc of state.documents) {
    const docTitle = doc.title || 'Untitled';

    const titleIdx = docTitle.toLowerCase().indexOf(lower);
    if (titleIdx !== -1) {
      results.push({
        documentId: doc.id, documentTitle: docTitle,
        sectionId: '', sectionType: 'title',
        snippet: docTitle, matchStart: titleIdx, matchLength: lower.length,
      });
    }

    for (const section of doc.sections) {
      const text = extractText(section);
      if (!text) continue;
      const idx = text.toLowerCase().indexOf(lower);
      if (idx === -1) continue;

      const start = Math.max(0, idx - SNIPPET_PAD);
      const end = Math.min(text.length, idx + lower.length + SNIPPET_PAD);
      const snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
      const snippetMatchStart = (start > 0 ? 1 : 0) + (idx - start);

      results.push({
        documentId: doc.id, documentTitle: docTitle,
        sectionId: section.id, sectionType: section.type,
        snippet, matchStart: snippetMatchStart, matchLength: lower.length,
      });
    }
  }

  return results;
}

function highlightSnippet(snippet: string, matchStart: number, matchLength: number): string {
  return escapeHtml(snippet.slice(0, matchStart))
    + `<mark>${escapeHtml(snippet.slice(matchStart, matchStart + matchLength))}</mark>`
    + escapeHtml(snippet.slice(matchStart + matchLength));
}

export class SearchBar {
  readonly el: HTMLElement;
  private input: HTMLInputElement;
  private resultsEl: HTMLElement;
  private countEl: HTMLElement;
  private results: SearchResult[] = [];
  private resultRows: HTMLElement[] = [];
  private activeIndex = -1;

  constructor(getState: () => AppState) {
    this.el = document.createElement('div');
    this.el.className = 'search-bar';

    const inputRow = document.createElement('div');
    inputRow.className = 'search-bar__input-row';
    inputRow.innerHTML = icon('search');

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'search-bar__input';
    this.input.placeholder = 'Search… (Ctrl+F)';
    this.input.setAttribute('autocomplete', 'off');
    this.input.addEventListener('input', () => {
      this.results = runSearch(getState(), this.input.value);
      this.activeIndex = this.results.length > 0 ? 0 : -1;
      this.renderResults();
    });
    this.input.addEventListener('keydown', (e) => this.onKeyDown(e));
    this.input.addEventListener('focus', () => { if (this.results.length) this.resultsEl.classList.add('is-open'); });
    this.input.addEventListener('blur', (e) => {
      // keep results open if focus moves into the results list
      if (!this.el.contains(e.relatedTarget as Node | null)) this.resultsEl.classList.remove('is-open');
    });

    this.countEl = document.createElement('span');
    this.countEl.className = 'search-bar__count';

    inputRow.appendChild(this.input);
    inputRow.appendChild(this.countEl);

    this.resultsEl = document.createElement('div');
    this.resultsEl.className = 'search-bar__results';
    this.resultsEl.addEventListener('mousedown', (e) => e.preventDefault()); // keep input focused

    this.el.appendChild(inputRow);
    this.el.appendChild(this.resultsEl);
  }

  focus(): void {
    this.input.focus();
    this.input.select();
  }

  private renderResults(): void {
    this.resultsEl.innerHTML = '';
    this.resultRows = [];

    const query = this.input.value;

    if (!query.trim()) {
      this.countEl.textContent = '';
      this.resultsEl.classList.remove('is-open');
      return;
    }

    this.countEl.textContent = String(this.results.length);
    this.resultsEl.classList.add('is-open');

    if (this.results.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'search-bar__empty';
      empty.textContent = 'No results';
      this.resultsEl.appendChild(empty);
      return;
    }

    this.results.forEach((result, i) => {
      const row = document.createElement('div');
      row.className = 'search-result' + (i === this.activeIndex ? ' is-active' : '');
      row.addEventListener('mousedown', () => this.jump(i, result));

      const meta = document.createElement('div');
      meta.className = 'search-result__meta';
      meta.innerHTML = `<span class="search-result__doc">${escapeHtml(result.documentTitle)}</span><span>›</span><span>${SECTION_LABELS[result.sectionType] ?? result.sectionType}</span>`;

      const snippet = document.createElement('div');
      snippet.className = 'search-result__snippet';
      snippet.innerHTML = highlightSnippet(result.snippet, result.matchStart, result.matchLength);

      row.appendChild(meta);
      row.appendChild(snippet);
      this.resultsEl.appendChild(row);
      this.resultRows.push(row);
    });
  }

  private setActive(index: number): void {
    this.resultRows[this.activeIndex]?.classList.remove('is-active');
    this.activeIndex = Math.max(0, Math.min(index, this.results.length - 1));
    const activeRow = this.resultRows[this.activeIndex];
    activeRow?.classList.add('is-active');
    activeRow?.scrollIntoView({ block: 'nearest' });
  }

  private jump(index: number, result: SearchResult): void {
    const selector = result.sectionId
      ? `[data-section-id="${result.sectionId}"]`
      : `[data-document-id="${result.documentId}"]`;
    const container = document.querySelector(selector);
    container?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (container) this.highlightInDom(container);
    this.resultsEl.classList.remove('is-open');
    this.input.blur();
  }

  private highlightInDom(container: Element): void {
    const query = this.input.value.toLowerCase();
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const text = node.nodeValue ?? '';
      const idx = text.toLowerCase().indexOf(query);
      if (idx === -1) continue;
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + query.length);
      const sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(range); }
      return;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape')    { this.input.value = ''; this.results = []; this.renderResults(); this.input.blur(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); this.setActive(this.activeIndex + 1); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); this.setActive(this.activeIndex - 1); return; }
    if (e.key === 'Enter') {
      const result = this.results[this.activeIndex];
      if (result) this.jump(this.activeIndex, result);
    }
  }
}
