import type { AppDocument, AppState, ChangeScope } from '../types.js';
import { store } from '../store/store.js';
import { SectionEditor } from './section-editor.js';
import { AddSectionBar } from './add-section-bar.js';
import { makeSortable } from '../dnd/sortable.js';
import { icon } from '../utils/icons.js';
import { onPasteText } from '../utils/clipboard.js';

export class DocumentEditor {
  readonly el: HTMLElement;
  readonly insertEl: HTMLButtonElement;
  private sectionEditorMap = new Map<string, SectionEditor>();
  private sectionsContainer: HTMLElement;
  private titleEl: HTMLElement;
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

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'icon-btn document-delete-btn';
    deleteBtn.title = 'Delete document';
    deleteBtn.innerHTML = icon('trash');
    deleteBtn.addEventListener('click', () => store.removeDocument(doc.id));

    header.appendChild(dragHandle);
    header.appendChild(this.titleEl);
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
    }
  }

  destroy(): void {
    this.sectionEditorMap.forEach((e) => e.destroy());
    this.sectionEditorMap.clear();
    this.addSectionBar.destroy();
    this.insertEl.remove();
    this.el.remove();
  }
}
