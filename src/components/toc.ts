import './toc.css';
import type { AppState, ChangeScope } from '../types.js';
import { store } from '../store/store.js';
import { icon } from '../utils/icons.js';
import { escapeHtml, stripHtml } from '../utils/html.js';

function headingLabel(data: Record<string, unknown>): string {
  return stripHtml((data['text'] as string) ?? '') || 'Untitled heading';
}

function headingIndent(data: Record<string, unknown>): number {
  const level = (data['level'] as string) ?? 'h2';
  return level === 'h1' ? 0 : level === 'h2' ? 1 : 2;
}

function affectsToc(scope: ChangeScope, state: AppState): boolean {
  switch (scope.kind) {
    case 'document-status':
      return false;
    case 'section-data': {
      const doc = state.documents.find((d) => d.id === scope.documentId);
      const section = doc?.sections.find((s) => s.id === scope.sectionId);
      return section?.type === 'heading';
    }
    default:
      return true;
  }
}

export class TableOfContents {
  readonly el: HTMLElement;
  private listEl: HTMLElement;
  private collapsed = new Set<string>();
  private unsubscribe: () => void;

  constructor() {
    this.el = document.createElement('nav');
    this.el.className = 'toc';
    this.el.setAttribute('aria-label', 'Table of contents');

    const header = document.createElement('div');
    header.className = 'toc__header';
    header.innerHTML = `<span class="toc__title">${icon('layoutSidebar')} Contents</span>`;

    this.listEl = document.createElement('div');
    this.listEl.className = 'toc__list';

    this.el.appendChild(header);
    this.el.appendChild(this.listEl);

    this.render(store.getSnapshot());
    this.unsubscribe = store.subscribe((scope, state) => {
      if (affectsToc(scope, state)) this.render(state);
    });
  }

  private render(state: AppState): void {
    this.listEl.innerHTML = '';

    for (const doc of state.documents) {
      const isCollapsed = this.collapsed.has(doc.id);

      const docRow = document.createElement('div');
      docRow.className = 'toc-doc' + (isCollapsed ? ' is-collapsed' : '');

      const chevron = document.createElement('button');
      chevron.type = 'button';
      chevron.className = 'toc-doc__chevron';
      chevron.setAttribute('aria-label', isCollapsed ? 'Expand' : 'Collapse');
      chevron.innerHTML = icon('chevronDown');
      chevron.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.collapsed.has(doc.id)) {
          this.collapsed.delete(doc.id);
        } else {
          this.collapsed.add(doc.id);
        }
        this.render(store.getSnapshot());
      });

      const docLabel = document.createElement('button');
      docLabel.type = 'button';
      docLabel.className = 'toc-doc__label';
      docLabel.title = doc.title || 'Untitled document';
      docLabel.innerHTML = escapeHtml(doc.title || 'Untitled document');
      docLabel.addEventListener('click', () => this.scrollTo(`[data-document-id="${doc.id}"]`));

      docRow.appendChild(chevron);
      docRow.appendChild(docLabel);
      this.listEl.appendChild(docRow);

      if (isCollapsed) continue;

      for (const section of doc.sections) {
        if (section.type !== 'heading') continue;
        const indent = headingIndent(section.data);
        const label = headingLabel(section.data);

        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'toc-item';
        item.dataset['indent'] = String(indent);
        item.title = label;
        item.style.paddingLeft = `${16 + indent * 12}px`;
        item.innerHTML = escapeHtml(label);
        item.addEventListener('click', () => this.scrollTo(`[data-section-id="${section.id}"]`));
        this.listEl.appendChild(item);
      }
    }
  }

  private scrollTo(selector: string): void {
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  destroy(): void {
    this.unsubscribe();
    this.el.remove();
  }
}
