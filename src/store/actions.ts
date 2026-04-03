import type { AppState, AppDocument, Section, ID, SectionPlugin, DocumentStatus } from '../types.js';
import { generateId } from '../utils/id.js';
import { moveArrayItem } from '../utils/array.js';

function emptyDocument(): AppDocument {
  return { id: generateId(), title: '', sections: [] };
}

export function createEmptyAppState(): AppState {
  return { documents: [emptyDocument()] };
}

// ── Document actions ──────────────────────────────────────────────────────

export function addDocument(state: AppState, afterIndex?: number): [AppState, ID] {
  const doc = emptyDocument();
  const docs = [...state.documents];
  const insertAt = afterIndex !== undefined ? afterIndex + 1 : docs.length;
  docs.splice(insertAt, 0, doc);
  return [{ documents: docs }, doc.id];
}

export function removeDocument(state: AppState, documentId: ID): AppState {
  return { documents: state.documents.filter((d) => d.id !== documentId) };
}

export function moveDocument(state: AppState, fromIndex: number, toIndex: number): AppState {
  const docs = moveArrayItem(state.documents, fromIndex, toIndex);
  return docs === state.documents ? state : { documents: docs };
}

export function updateDocumentTitle(state: AppState, documentId: ID, title: string): AppState {
  const doc = state.documents.find((d) => d.id === documentId);
  if (!doc || doc.title === title) return state;
  return {
    documents: state.documents.map((d) => (d.id !== documentId ? d : { ...d, title })),
  };
}

export function updateDocumentStatus(state: AppState, documentId: ID, status: DocumentStatus): AppState {
  const doc = state.documents.find((d) => d.id === documentId);
  if (!doc || doc.status === status) return state;
  return mapDoc(state, documentId, (d) => ({ ...d, status }));
}

// ── Section actions ───────────────────────────────────────────────────────

function mapDoc(state: AppState, documentId: ID, fn: (doc: AppDocument) => AppDocument): AppState {
  return { documents: state.documents.map((d) => (d.id !== documentId ? d : fn(d))) };
}

export function addSection(
  state: AppState,
  documentId: ID,
  plugin: SectionPlugin,
  afterIndex?: number
): [AppState, ID] {
  const section: Section = { id: generateId(), type: plugin.typeId, data: { ...plugin.defaultData } };
  const newState = mapDoc(state, documentId, (doc) => {
    const sections = [...doc.sections];
    const insertAt = afterIndex !== undefined ? afterIndex + 1 : sections.length;
    sections.splice(insertAt, 0, section);
    return { ...doc, sections };
  });
  return [newState, section.id];
}

export function removeSection(state: AppState, documentId: ID, sectionId: ID): AppState {
  return mapDoc(state, documentId, (doc) => ({
    ...doc,
    sections: doc.sections.filter((s) => s.id !== sectionId),
  }));
}

export function updateSectionData(
  state: AppState,
  documentId: ID,
  sectionId: ID,
  patch: Record<string, unknown>
): AppState {
  if (Object.keys(patch).length === 0) return state;
  return mapDoc(state, documentId, (doc) => ({
    ...doc,
    sections: doc.sections.map((s) =>
      s.id !== sectionId ? s : { ...s, data: { ...s.data, ...patch } }
    ),
  }));
}

export function moveSection(
  state: AppState,
  documentId: ID,
  fromIndex: number,
  toIndex: number
): AppState {
  return mapDoc(state, documentId, (doc) => {
    const sections = moveArrayItem(doc.sections, fromIndex, toIndex);
    return sections === doc.sections ? doc : { ...doc, sections };
  });
}
