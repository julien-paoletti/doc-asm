import type { AppState, ChangeScope, ID, SectionPlugin } from '../types.js';
import {
  createEmptyAppState,
  addDocument,
  removeDocument,
  moveDocument,
  updateDocumentTitle,
  addSection,
  removeSection,
  updateSectionData,
  moveSection,
} from './actions.js';

export type StoreListener = (scope: ChangeScope, state: Readonly<AppState>) => void;

class AppStore {
  private state: AppState = createEmptyAppState();
  private listeners = new Set<StoreListener>();

  subscribe(fn: StoreListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getSnapshot(): Readonly<AppState> {
    return this.state;
  }

  private notify(scope: ChangeScope): void {
    const state = this.state;
    this.listeners.forEach((fn) => fn(scope, state));
  }

  // ── Document actions ────────────────────────────────────────────────────

  addDocument(afterIndex?: number): ID {
    const [newState, documentId] = addDocument(this.state, afterIndex);
    this.state = newState;
    this.notify({ kind: 'document-add', documentId });
    return documentId;
  }

  removeDocument(documentId: ID): void {
    this.state = removeDocument(this.state, documentId);
    this.notify({ kind: 'document-remove', documentId });
  }

  moveDocument(fromIndex: number, toIndex: number): void {
    const newState = moveDocument(this.state, fromIndex, toIndex);
    if (newState === this.state) return;
    this.state = newState;
    this.notify({ kind: 'document-order' });
  }

  updateDocumentTitle(documentId: ID, title: string): void {
    const newState = updateDocumentTitle(this.state, documentId, title);
    if (newState === this.state) return;
    this.state = newState;
    this.notify({ kind: 'document-title', documentId });
  }

  // ── Section actions ─────────────────────────────────────────────────────

  addSection(documentId: ID, plugin: SectionPlugin, afterIndex?: number): ID {
    const [newState, sectionId] = addSection(this.state, documentId, plugin, afterIndex);
    this.state = newState;
    this.notify({ kind: 'section-add', documentId, sectionId });
    return sectionId;
  }

  removeSection(documentId: ID, sectionId: ID): void {
    this.state = removeSection(this.state, documentId, sectionId);
    this.notify({ kind: 'section-remove', documentId, sectionId });
  }

  updateSectionData(documentId: ID, sectionId: ID, patch: Record<string, unknown>): void {
    const newState = updateSectionData(this.state, documentId, sectionId, patch);
    if (newState === this.state) return;
    this.state = newState;
    this.notify({ kind: 'section-data', documentId, sectionId });
  }

  moveSection(documentId: ID, fromIndex: number, toIndex: number): void {
    const newState = moveSection(this.state, documentId, fromIndex, toIndex);
    if (newState === this.state) return;
    this.state = newState;
    this.notify({ kind: 'section-order', documentId });
  }

  loadState(state: AppState): void {
    this.state = state;
    this.notify({ kind: 'state-reset' });
  }
}

export const store = new AppStore();
