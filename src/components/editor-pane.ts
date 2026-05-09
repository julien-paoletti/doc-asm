import type { ChangeScope, AppState, AppDocument } from '../types.js';
import { store } from '../store/store.js';
import { DocumentEditor } from './document-editor.js';
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

    this.rebuild(store.getSnapshot());

    const addDocBtn = document.createElement('button');
    addDocBtn.type = 'button';
    addDocBtn.className = 'add-document-btn';
    addDocBtn.innerHTML = `${icon('plus')} Add document`;
    addDocBtn.addEventListener('click', () => store.addDocument());

    this.unsubscribe = store.subscribe((scope, state) => this.onStoreChange(scope, state));

    // Prevent clicks on the pane background from focusing contenteditable
    // elements inside document cards at the same vertical position.
    this.el.addEventListener('mousedown', (e) => {
      if (e.target === this.el || e.target === this.documentsContainer) {
        (document.activeElement as HTMLElement | null)?.blur();
        e.preventDefault();
      }
    });

    // Show section controls for whichever section's vertical band the mouse is in,
    // even when the cursor is to the right of the section card.
    let rafPending = false;
    this.el.addEventListener('mousemove', (e) => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => { rafPending = false; this.updateActiveSection(e.clientY); });
    });
    this.el.addEventListener('mouseleave', () => this.clearActiveSection());

    this.el.appendChild(this.documentsContainer);
    this.el.appendChild(addDocBtn);
  }

  private activeSection: HTMLElement | null = null;

  private updateActiveSection(clientY: number): void {
    let match: HTMLElement | null = null;
    for (const el of this.el.querySelectorAll<HTMLElement>('.section-editor')) {
      const { top, bottom } = el.getBoundingClientRect();
      if (clientY >= top && clientY <= bottom) { match = el; break; }
    }
    if (match === this.activeSection) return;
    this.activeSection?.classList.remove('is-active');
    this.activeSection = match;
    match?.classList.add('is-active');
  }

  private clearActiveSection(): void {
    this.activeSection?.classList.remove('is-active');
    this.activeSection = null;
  }

  private createDocumentEditor(doc: AppDocument): DocumentEditor {
    return new DocumentEditor(doc, () => {
      const currentIdx = store.getSnapshot().documents.findIndex((d) => d.id === doc.id);
      store.addDocument(currentIdx - 1);
    });
  }

  private rebuild(state: AppState): void {
    this.documentEditorMap.forEach((e) => e.destroy());
    this.documentEditorMap.clear();
    this.documentsContainer.innerHTML = '';
    state.documents.forEach((doc) => {
      const editor = this.createDocumentEditor(doc);
      this.documentEditorMap.set(doc.id, editor);
      this.documentsContainer.appendChild(editor.insertEl);
      this.documentsContainer.appendChild(editor.el);
    });
  }

  private reconcile(state: AppState): void {
    const incoming = new Set(state.documents.map((d) => d.id));
    let orderChanged = this.documentEditorMap.size !== state.documents.length;

    for (const [id, editor] of this.documentEditorMap) {
      if (!incoming.has(id)) {
        editor.destroy();
        this.documentEditorMap.delete(id);
        orderChanged = true;
      }
    }

    // Each doc occupies two adjacent slots (insertEl + el), so doc at index i
    // lives at container child indices i*2 and i*2+1.
    state.documents.forEach((doc, i) => {
      const existing = this.documentEditorMap.get(doc.id);
      if (existing) {
        existing.reconcile(doc);
        if (!orderChanged) {
          const els = this.documentsContainer.children;
          if (els[i * 2] !== existing.insertEl || els[i * 2 + 1] !== existing.el) orderChanged = true;
        }
      } else {
        this.documentEditorMap.set(doc.id, this.createDocumentEditor(doc));
        orderChanged = true;
      }
    });

    if (orderChanged) {
      for (const doc of state.documents) {
        const editor = this.documentEditorMap.get(doc.id);
        if (editor) {
          this.documentsContainer.appendChild(editor.insertEl);
          this.documentsContainer.appendChild(editor.el);
        }
      }
    }
  }

  private onStoreChange(scope: ChangeScope, state: AppState): void {
    switch (scope.kind) {
      case 'state-reset':
        this.reconcile(state);
        return;
      case 'document-add': {
        const doc = state.documents.find((d) => d.id === scope.documentId);
        if (!doc) return;

        const idx = state.documents.indexOf(doc);
        const editor = this.createDocumentEditor(doc);
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
