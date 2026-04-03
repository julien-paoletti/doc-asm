import type { AppState, AppDocument, Section, DocumentStatus } from '../types.js';

export const CURRENT_VERSION = 1;
export const FILE_EXTENSION = '.docasm';
export const FILE_MIME = 'application/json';

export interface DocAsmFile {
  version: number;
  documents: AppDocument[];
}

export function serialize(state: AppState): string {
  const file: DocAsmFile = {
    version: CURRENT_VERSION,
    documents: state.documents,
  };
  return JSON.stringify(file, null, 2);
}

export type ParseResult =
  | { ok: true; state: AppState }
  | { ok: false; error: string };

export function parse(raw: string): ParseResult {
  let file: unknown;
  try {
    file = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Invalid JSON file.' };
  }

  if (!isObject(file)) return { ok: false, error: 'Invalid file format.' };

  const version = (file as Record<string, unknown>).version;
  if (typeof version !== 'number') return { ok: false, error: 'Missing "version" field.' };
  if (version > CURRENT_VERSION) {
    return { ok: false, error: `Version ${version} is not supported (max ${CURRENT_VERSION}).` };
  }

  // Version 1 — layout matches AppState directly
  const documents = (file as Record<string, unknown>).documents;
  if (!Array.isArray(documents)) return { ok: false, error: 'Missing "documents" field.' };

  const parsedDocs: AppDocument[] = [];
  for (const doc of documents) {
    if (!isObject(doc)) return { ok: false, error: 'Invalid document.' };
    const d = doc as Record<string, unknown>;
    if (typeof d.id !== 'string') return { ok: false, error: 'Document missing id.' };
    if (typeof d.title !== 'string') return { ok: false, error: 'Document missing title.' };
    if (!Array.isArray(d.sections)) return { ok: false, error: 'Document missing sections.' };

    const parsedSections: Section[] = [];
    for (const sec of d.sections) {
      if (!isObject(sec)) return { ok: false, error: 'Invalid section.' };
      const s = sec as Record<string, unknown>;
      if (typeof s.id !== 'string') return { ok: false, error: 'Section missing id.' };
      if (typeof s.type !== 'string') return { ok: false, error: 'Section missing type.' };
      if (!isObject(s.data)) return { ok: false, error: 'Section missing data.' };
      parsedSections.push({ id: s.id, type: s.type, data: s.data as Record<string, unknown> });
    }

    const validStatuses: DocumentStatus[] = ['draft', 'review', 'done'];
    const status = validStatuses.includes(d.status as DocumentStatus) ? d.status as DocumentStatus : undefined;
    parsedDocs.push({ id: d.id, title: d.title, sections: parsedSections, status });
  }

  return { ok: true, state: { documents: parsedDocs } };
}

function isObject(v: unknown): v is object {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
