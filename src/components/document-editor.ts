import type { AppDocument, AppState, ChangeScope, DocumentStatus } from '../types.js';
import { store } from '../store/store.js';
import { SectionEditor } from './section-editor.js';
import { AddSectionBar } from './add-section-bar.js';
import { makeSortable } from '../dnd/sortable.js';
import { icon } from '../utils/icons.js';
import { onPasteText } from '../utils/clipboard.js';

const STATUS_LABELS: Record<DocumentStatus, string> = { draft: 'Draft', review: 'Review', done: 'Done' };
const STATUS_NEXT: Record<DocumentStatus, DocumentStatus> = { draft: 'review', review: 'done', done: 'draft' };

export class DocumentEditor {
  readonly el: HTMLElement;
  readonly insertEl: HTMLButtonElement;
  private sectionEditorMap = new Map<string, SectionEditor>();
  private sectionsContainer: HTMLElement;
  private titleEl: HTMLElement;
  private statusBadge: HTMLButtonElement;
  private addSectionBar: AddSectionBar;

  constructor(doc: AppDocument, onInsertBefore: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'document-editor';
    this.el.dataset['documentId'] = doc.id;

    this.insertEl = document.createElement('button');
    this.insertEl.type = 'button';
    this.insertEl.className = 'insert-document-btn';
    this.insertEl.setAttribute('data-no-sort', '');
    this.insertEl.title = 'Insert document before';
    this.insertEl.innerHTML = `${icon('plus')} Insert document`;
    this.insertEl.addEventListener('click', onInsertBefore);

    // ── Document header ─────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'document-editor__header';

    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle document-drag-handle';
    dragHandle.setAttribute('aria-label', 'Move document');
    dragHandle.innerHTML = icon('gripVertical');

    this.titleEl = document.createElement('div');
    this.titleEl.contentEditable = 'true';
    this.titleEl.className = 'document-editor__title';
    this.titleEl.setAttribute('data-placeholder', 'Untitled document…');
    this.titleEl.textContent = doc.title;
    this.titleEl.addEventListener('input', () => {
      store.updateDocumentTitle(doc.id, this.titleEl.textContent ?? '');
    });
    this.titleEl.addEventListener('paste', onPasteText);

    this.statusBadge = document.createElement('button');
    this.statusBadge.type = 'button';
    this.statusBadge.className = 'document-status-badge';
    this.updateStatusBadge(doc.status);
    this.statusBadge.addEventListener('click', () => {
      const current = (this.statusBadge.dataset['status'] ?? 'draft') as DocumentStatus;
      store.updateDocumentStatus(doc.id, STATUS_NEXT[current]);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'icon-btn document-delete-btn';
    deleteBtn.title = 'Delete document';
    deleteBtn.innerHTML = icon('trash');
    deleteBtn.addEventListener('click', () => store.removeDocument(doc.id));

    header.appendChild(dragHandle);
    header.appendChild(this.titleEl);
    header.appendChild(this.statusBadge);
    header.appendChild(deleteBtn);

    // ── Sections container ──────────────────────────────────────────────────
    this.sectionsContainer = document.createElement('div');
    this.sectionsContainer.className = 'sections-container';

    makeSortable({
      container: this.sectionsContainer,
      group: `sections-${doc.id}`,
      onEnd: (from, to) => store.moveSection(doc.id, from, to),
    });

    doc.sections.forEach((section) => {
      const editor = new SectionEditor(doc.id, section);
      this.sectionEditorMap.set(section.id, editor);
      this.sectionsContainer.appendChild(editor.el);
    });

    // ── Add section bar ──────────────────────────────────────────────────────
    this.addSectionBar = new AddSectionBar(doc.id);

    this.el.appendChild(header);
    this.el.appendChild(this.sectionsContainer);
    this.el.appendChild(this.addSectionBar.el);
  }

  reconcile(doc: AppDocument): void {
    if (this.titleEl.textContent !== doc.title) this.titleEl.textContent = doc.title;
    const s = doc.status ?? 'draft';
    if (this.statusBadge.dataset['status'] !== s) this.updateStatusBadge(doc.status);

    const incoming = new Set(doc.sections.map((sec) => sec.id));
    let orderChanged = this.sectionEditorMap.size !== doc.sections.length;

    for (const [id, editor] of this.sectionEditorMap) {
      if (!incoming.has(id)) {
        editor.destroy();
        this.sectionEditorMap.delete(id);
        orderChanged = true;
      }
    }

    doc.sections.forEach((section, i) => {
      const existing = this.sectionEditorMap.get(section.id);
      if (existing) {
        existing.update(section.data);
        if (!orderChanged) {
          const els = this.sectionsContainer.children;
          if (els[i] !== existing.el) orderChanged = true;
        }
      } else {
        this.sectionEditorMap.set(section.id, new SectionEditor(doc.id, section));
        orderChanged = true;
      }
    });

    if (orderChanged) {
      for (const section of doc.sections) {
        const editor = this.sectionEditorMap.get(section.id);
        if (editor) this.sectionsContainer.appendChild(editor.el);
      }
    }
  }

  handleStoreChange(scope: ChangeScope, state: Readonly<AppState>, documentId: string): void {
    if (!('documentId' in scope) || scope.documentId !== documentId) return;

    const doc = state.documents.find((d) => d.id === documentId);

    switch (scope.kind) {
      case 'section-add': {
        if (!doc) return;
        const section = doc.sections.find((s) => s.id === scope.sectionId);
        if (!section) return;

        const editor = new SectionEditor(documentId, section);
        this.sectionEditorMap.set(section.id, editor);

        const idx = doc.sections.indexOf(section);
        const nextSection = doc.sections[idx + 1];
        const nextEditor = nextSection ? this.sectionEditorMap.get(nextSection.id) : null;
        if (nextEditor) {
          this.sectionsContainer.insertBefore(editor.el, nextEditor.el);
        } else {
          this.sectionsContainer.appendChild(editor.el);
        }
        requestAnimationFrame(() => editor.focus());
        break;
      }

      case 'section-remove':
        this.sectionEditorMap.get(scope.sectionId)?.destroy();
        this.sectionEditorMap.delete(scope.sectionId);
        break;

      case 'section-order':
        doc?.sections.forEach((section) => {
          const editor = this.sectionEditorMap.get(section.id);
          if (editor) this.sectionsContainer.appendChild(editor.el);
        });
        break;

      case 'document-title':
        if (doc && this.titleEl.textContent !== doc.title) {
          this.titleEl.textContent = doc.title;
        }
        break;

      case 'document-status':
        if (doc) this.updateStatusBadge(doc.status);
        break;
    }
  }

  private updateStatusBadge(status: DocumentStatus | undefined): void {
    const s = status ?? 'draft';
    this.statusBadge.textContent = STATUS_LABELS[s];
    this.statusBadge.dataset['status'] = s;
  }

  destroy(): void {
    this.sectionEditorMap.forEach((e) => e.destroy());
    this.sectionEditorMap.clear();
    this.addSectionBar.destroy();
    this.insertEl.remove();
    this.el.remove();
  }
}
