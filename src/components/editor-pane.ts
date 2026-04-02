import type { ChangeScope, AppState } from '../types.js';
import { store } from '../store/store.js';
import { DocumentEditor } from './document-editor.js';
import { makeSortable } from '../dnd/sortable.js';
import { icon } from '../utils/icons.js';

export class EditorPane {
  readonly el: HTMLElement;
  private documentEditorMap = new Map<string, DocumentEditor>();
  private documentsContainer: HTMLElement;
  private unsubscribe: () => void;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'editor-pane';

    this.documentsContainer = document.createElement('div');
    this.documentsContainer.className = 'documents-container';

    makeSortable({
      container: this.documentsContainer,
      group: 'documents',
      onEnd: (from, to) => {
        // SortableJS counts only draggable items; insert buttons have data-no-sort
        // so the indices it reports correspond directly to document positions.
        store.moveDocument(from, to);
      },
    });

    this.rebuild(store.getSnapshot());

    const addDocBtn = document.createElement('button');
    addDocBtn.type = 'button';
    addDocBtn.className = 'add-document-btn';
    addDocBtn.innerHTML = `${icon('plus')} Add document`;
    addDocBtn.addEventListener('click', () => store.addDocument());

    this.unsubscribe = store.subscribe((scope, state) => this.onStoreChange(scope, state));

    this.el.appendChild(this.documentsContainer);
    this.el.appendChild(addDocBtn);
  }

  private rebuild(state: AppState): void {
    this.documentEditorMap.forEach((e) => e.destroy());
    this.documentEditorMap.clear();
    this.documentsContainer.innerHTML = '';
    state.documents.forEach((doc) => {
      const editor = new DocumentEditor(doc, () => {
        const currentIdx = store.getSnapshot().documents.findIndex((d) => d.id === doc.id);
        store.addDocument(currentIdx - 1);
      });
      this.documentEditorMap.set(doc.id, editor);
      this.documentsContainer.appendChild(editor.insertEl);
      this.documentsContainer.appendChild(editor.el);
    });
  }

  private onStoreChange(scope: ChangeScope, state: AppState): void {
    switch (scope.kind) {
      case 'state-reset':
        this.rebuild(state);
        return;
      case 'document-add': {
        const doc = state.documents.find((d) => d.id === scope.documentId);
        if (!doc) return;

        const idx = state.documents.indexOf(doc);
        const editor = new DocumentEditor(doc, () => {
          const currentIdx = store.getSnapshot().documents.findIndex((d) => d.id === doc.id);
          store.addDocument(currentIdx - 1);
        });
        this.documentEditorMap.set(doc.id, editor);

        const nextDoc = state.documents[idx + 1];
        const nextEditor = nextDoc ? this.documentEditorMap.get(nextDoc.id) : null;
        if (nextEditor) {
          this.documentsContainer.insertBefore(editor.el, nextEditor.insertEl);
          this.documentsContainer.insertBefore(editor.insertEl, editor.el);
        } else {
          this.documentsContainer.appendChild(editor.insertEl);
          this.documentsContainer.appendChild(editor.el);
        }
        break;
      }

      case 'document-remove':
        this.documentEditorMap.get(scope.documentId)?.destroy();
        this.documentEditorMap.delete(scope.documentId);
        break;

      case 'document-order':
        state.documents.forEach((doc) => {
          const editor = this.documentEditorMap.get(doc.id);
          if (editor) {
            this.documentsContainer.appendChild(editor.insertEl);
            this.documentsContainer.appendChild(editor.el);
          }
        });
        break;

      default:
        if ('documentId' in scope) {
          this.documentEditorMap
            .get(scope.documentId)
            ?.handleStoreChange(scope, state, scope.documentId);
        }
    }
  }

  destroy(): void {
    this.unsubscribe();
    this.documentEditorMap.forEach((e) => e.destroy());
    this.documentEditorMap.clear();
    this.el.remove();
  }
}
