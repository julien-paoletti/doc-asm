import type { AppState, ChangeScope, ID, SectionPlugin, DocumentStatus } from '../types.js';
import {
  createEmptyAppState,
  addDocument,
  removeDocument,
  moveDocument,
  updateDocumentTitle,
  updateDocumentStatus,
  addSection,
  removeSection,
  updateSectionData,
  moveSection,
} from './actions.js';

export type StoreListener = (scope: ChangeScope, state: Readonly<AppState>) => void;

const HISTORY_LIMIT = 100;
const COALESCE_MS = 500;

class AppStore {
  private state: AppState = createEmptyAppState();
  private listeners = new Set<StoreListener>();
  private undoStack: AppState[] = [];
  private redoStack: AppState[] = [];
  private lastCoalesceKey = '';
  private lastCoalesceTime = 0;

  subscribe(fn: StoreListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getSnapshot(): Readonly<AppState> {
    return this.state;
  }

  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }

  private notify(scope: ChangeScope): void {
    const state = this.state;
    this.listeners.forEach((fn) => fn(scope, state));
  }

  // Push a snapshot onto the undo stack. Pass a coalesceKey to merge rapid
  // successive changes (e.g. typing) into a single undo step.
  private commit(newState: AppState, scope: ChangeScope, coalesceKey = ''): void {
    const now = Date.now();
    const shouldCoalesce =
      coalesceKey !== '' &&
      coalesceKey === this.lastCoalesceKey &&
      now - this.lastCoalesceTime < COALESCE_MS;

    if (!shouldCoalesce) {
      this.undoStack.push(this.state);
      if (this.undoStack.length > HISTORY_LIMIT) this.undoStack = this.undoStack.slice(1);
    }
    this.redoStack = [];
    this.lastCoalesceKey = coalesceKey;
    this.lastCoalesceTime = now;
    this.state = newState;
    this.notify(scope);
  }

  undo(): void {
    const prev = this.undoStack.pop();
    if (!prev) return;
    this.redoStack.push(this.state);
    this.lastCoalesceKey = '';
    this.state = prev;
    this.notify({ kind: 'state-reset' });
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(this.state);
    this.lastCoalesceKey = '';
    this.state = next;
    this.notify({ kind: 'state-reset' });
  }

  // ── Document actions ────────────────────────────────────────────────────

  addDocument(afterIndex?: number): ID {
    const [newState, documentId] = addDocument(this.state, afterIndex);
    this.commit(newState, { kind: 'document-add', documentId });
    return documentId;
  }

  removeDocument(documentId: ID): void {
    const newState = removeDocument(this.state, documentId);
    this.commit(newState, { kind: 'document-remove', documentId });
  }

  moveDocument(fromIndex: number, toIndex: number): void {
    const newState = moveDocument(this.state, fromIndex, toIndex);
    if (newState === this.state) return;
    this.commit(newState, { kind: 'document-order' });
  }

  updateDocumentTitle(documentId: ID, title: string): void {
    const newState = updateDocumentTitle(this.state, documentId, title);
    if (newState === this.state) return;
    this.commit(newState, { kind: 'document-title', documentId }, `title:${documentId}`);
  }

  updateDocumentStatus(documentId: ID, status: DocumentStatus): void {
    const newState = updateDocumentStatus(this.state, documentId, status);
    if (newState === this.state) return;
    this.commit(newState, { kind: 'document-status', documentId });
  }

  // ── Section actions ─────────────────────────────────────────────────────

  addSection(documentId: ID, plugin: SectionPlugin, afterIndex?: number): ID {
    const [newState, sectionId] = addSection(this.state, documentId, plugin, afterIndex);
    this.commit(newState, { kind: 'section-add', documentId, sectionId });
    return sectionId;
  }

  removeSection(documentId: ID, sectionId: ID): void {
    const newState = removeSection(this.state, documentId, sectionId);
    this.commit(newState, { kind: 'section-remove', documentId, sectionId });
  }

  updateSectionData(documentId: ID, sectionId: ID, patch: Record<string, unknown>): void {
    const newState = updateSectionData(this.state, documentId, sectionId, patch);
    if (newState === this.state) return;
    this.commit(newState, { kind: 'section-data', documentId, sectionId }, `data:${documentId}:${sectionId}`);
  }

  moveSection(documentId: ID, fromIndex: number, toIndex: number): void {
    const newState = moveSection(this.state, documentId, fromIndex, toIndex);
    if (newState === this.state) return;
    this.commit(newState, { kind: 'section-order', documentId });
  }

  loadState(state: AppState): void {
    this.undoStack = [];
    this.redoStack = [];
    this.lastCoalesceKey = '';
    this.state = state;
    this.notify({ kind: 'state-reset' });
  }
}

export const store = new AppStore();
