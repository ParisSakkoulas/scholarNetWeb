export type ReferenceSource = 'openalex' | 'crossref' | 'manual' | 'bibtex';
export type ReferenceStatus = 'resolved' | 'unresolved';

export interface ReferenceSnapshot {
  title?: string;
  authors?: string[];
  year?: number;
  doi?: string;
  openalexId?: string;
  venue?: string;
}

/** A scholarNet publication a reference points to (card fields only). */
export interface CitedWork {
  _id: string;
  title: string;
  type: string;
  year: number;
  authors?: { name: string }[];
  identifiers?: { doi?: string };
}

/** Matches GET /publications/:id/references. */
export interface PublicationReference {
  _id: string;
  citing: string;
  cited: CitedWork | null;
  key: string;
  position: number;
  raw?: string;
  snapshot?: ReferenceSnapshot;
  source: ReferenceSource;
  locked: boolean;
  status: ReferenceStatus;
  createdAt: string;
}

/** Body for POST/PATCH references. Point to a scholarNet publication, a DOI, or type the metadata. */
export interface ReferenceInput {
  citedPublicationId?: string;
  doi?: string;
  title?: string;
  authors?: string[];
  year?: number;
  venue?: string;
  raw?: string;
}

export interface ReferenceImport {
  format: 'bibtex' | 'text';
  content: string;
}

/** A reference queued while the publication does not exist yet (create dialog). */
export interface DraftReference {
  input: ReferenceInput;
  /** Title shown in the list when `input` only holds a publication id. */
  label?: string;
}

export interface ReferencePage<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface SyncResult {
  total: number;
  added: number;
  skippedDeleted: number;
}
