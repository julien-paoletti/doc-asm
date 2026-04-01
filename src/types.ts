export type ID = string;

export interface Section {
  id: ID;
  type: string;
  data: Record<string, unknown>;
}

export interface AppDocument {
  id: ID;
  title: string;
  sections: Section[];
}

export interface AppState {
  documents: AppDocument[];
}

export interface SectionPlugin<TData extends Record<string, unknown> = Record<string, unknown>> {
  typeId: string;
  label: string;
  icon: string;
  defaultData: TData;
  createEditor(data: TData, onChange: (patch: Partial<TData>) => void): { el: HTMLElement; focusTitle?(): void };
}

export type ChangeScope =
  | { kind: 'section-data';    documentId: ID; sectionId: ID }
  | { kind: 'section-add';     documentId: ID; sectionId: ID }
  | { kind: 'section-remove';  documentId: ID; sectionId: ID }
  | { kind: 'section-order';   documentId: ID }
  | { kind: 'document-add';    documentId: ID }
  | { kind: 'document-remove'; documentId: ID }
  | { kind: 'document-order' }
  | { kind: 'document-title';  documentId: ID }
  | { kind: 'state-reset' };
