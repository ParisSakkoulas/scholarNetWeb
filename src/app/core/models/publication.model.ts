export type PublicationType =
  | 'journal_article'
  | 'conference_paper'
  | 'book'
  | 'book_chapter'
  | 'thesis'
  | 'technical_report'
  | 'preprint'
  | 'dataset'
  | 'patent'
  | 'other';

export type PublicationVisibility = 'public' | 'followers' | 'private';

export const PUBLICATION_TYPE_LABEL: Record<PublicationType, string> = {
  journal_article: 'Journal Article',
  conference_paper: 'Conference Paper',
  book: 'Book',
  book_chapter: 'Book Chapter',
  thesis: 'Thesis',
  technical_report: 'Technical Report',
  preprint: 'Preprint',
  dataset: 'Dataset',
  patent: 'Patent',
  other: 'Other',
};

export const PUBLICATION_VISIBILITY_LABEL: Record<PublicationVisibility, string> = {
  public: 'Public',
  followers: 'Followers only',
  private: 'Private',
};

export interface PublicationAuthor {
  user?: string | null;
  name: string;
  affiliation?: string;
  orcid?: string;
  order?: number;
  isCorresponding?: boolean;
  confirmed?: boolean;
}

export interface PublicationIdentifiers {
  doi?: string;
  openalexId?: string;
  isbn?: string;
  issn?: string;
  arxivId?: string;
  pmid?: string;
  patentNumber?: string;
  handle?: string;
}

export interface PublicationUploader {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  profilePhotoUrl?: string;
}

/**
 * A publication as returned by the API. Type-specific fields (journalName, degree, ...)
 * sit at the top level, so they are reachable through the index signature.
 */
export interface Publication {
  _id: string;
  type: PublicationType;
  title: string;
  abstract?: string;
  authors: PublicationAuthor[];
  year: number;
  publishedAt?: string;
  language?: string;
  keywords: string[];
  fields: string[];
  identifiers?: PublicationIdentifiers;
  url?: string;
  visibility: PublicationVisibility;
  license?: string;
  uploadedBy: PublicationUploader;
  metrics?: { views: number; downloads: number; citations: number; reads: number };
  createdAt: string;
  updatedAt: string;
  [typeSpecific: string]: unknown;
}

/** Body for POST /publications and PATCH /publications/:id (type is create-only). */
export type PublicationPayload = Record<string, unknown>;

export interface PublicationPage {
  data: Publication[];
  total: number;
  page: number;
  limit: number;
}

// ---------------- type-specific form fields ----------------

export type FieldKind = 'text' | 'number' | 'date' | 'select' | 'boolean';

export interface TypeField {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  options?: { label: string; value: string }[];
}

const opts = (...values: string[]) =>
  values.map((v) => ({
    value: v,
    label: v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' '),
  }));

/** Mirrors the discriminator schemas in the API (nested lists like editors are not editable here). */
export const TYPE_FIELDS: Record<PublicationType, TypeField[]> = {
  journal_article: [
    { key: 'journalName', label: 'Journal', kind: 'text', required: true },
    { key: 'volume', label: 'Volume', kind: 'text' },
    { key: 'issue', label: 'Issue', kind: 'text' },
    { key: 'pages', label: 'Pages', kind: 'text' },
    { key: 'articleNumber', label: 'Article number', kind: 'text' },
    { key: 'publisher', label: 'Publisher', kind: 'text' },
    { key: 'peerReviewed', label: 'Peer reviewed', kind: 'boolean' },
  ],
  conference_paper: [
    { key: 'conferenceName', label: 'Conference', kind: 'text', required: true },
    { key: 'location', label: 'Location', kind: 'text' },
    { key: 'conferenceDate', label: 'Conference date', kind: 'date' },
    { key: 'proceedingsTitle', label: 'Proceedings title', kind: 'text' },
    { key: 'pages', label: 'Pages', kind: 'text' },
    { key: 'publisher', label: 'Publisher', kind: 'text' },
    {
      key: 'presentationType',
      label: 'Presentation type',
      kind: 'select',
      options: opts('oral', 'poster', 'keynote', 'workshop'),
    },
  ],
  book: [
    { key: 'publisher', label: 'Publisher', kind: 'text', required: true },
    { key: 'edition', label: 'Edition', kind: 'text' },
    { key: 'series', label: 'Series', kind: 'text' },
    { key: 'numberOfPages', label: 'Number of pages', kind: 'number' },
  ],
  book_chapter: [
    { key: 'bookTitle', label: 'Book title', kind: 'text', required: true },
    { key: 'publisher', label: 'Publisher', kind: 'text', required: true },
    { key: 'pages', label: 'Pages', kind: 'text' },
    { key: 'chapterNumber', label: 'Chapter number', kind: 'text' },
    { key: 'edition', label: 'Edition', kind: 'text' },
    { key: 'series', label: 'Series', kind: 'text' },
  ],
  thesis: [
    {
      key: 'degree',
      label: 'Degree',
      kind: 'select',
      required: true,
      options: opts('bachelor', 'master', 'phd', 'habilitation', 'other'),
    },
    { key: 'institution', label: 'Institution', kind: 'text', required: true },
    { key: 'department', label: 'Department', kind: 'text' },
    { key: 'defenseDate', label: 'Defense date', kind: 'date' },
  ],
  technical_report: [
    { key: 'institution', label: 'Institution', kind: 'text', required: true },
    { key: 'reportNumber', label: 'Report number', kind: 'text' },
    { key: 'sponsor', label: 'Sponsor', kind: 'text' },
    { key: 'fundingAgency', label: 'Funding agency', kind: 'text' },
    { key: 'grantNumber', label: 'Grant number', kind: 'text' },
  ],
  preprint: [
    {
      key: 'server',
      label: 'Server',
      kind: 'select',
      required: true,
      options: [
        { label: 'arXiv', value: 'arxiv' },
        { label: 'bioRxiv', value: 'biorxiv' },
        { label: 'medRxiv', value: 'medrxiv' },
        { label: 'SSRN', value: 'ssrn' },
        { label: 'Research Square', value: 'researchsquare' },
        { label: 'Other', value: 'other' },
      ],
    },
    { key: 'version', label: 'Version', kind: 'number' },
    {
      key: 'status',
      label: 'Status',
      kind: 'select',
      options: opts('submitted', 'under_review', 'accepted', 'published'),
    },
  ],
  dataset: [
    { key: 'repository', label: 'Repository', kind: 'text', required: true },
    { key: 'version', label: 'Version', kind: 'text' },
    { key: 'format', label: 'Format', kind: 'text' },
    { key: 'sizeBytes', label: 'Size (bytes)', kind: 'number' },
  ],
  patent: [
    { key: 'patentOffice', label: 'Patent office', kind: 'text', required: true },
    { key: 'patentNumber', label: 'Patent number', kind: 'text', required: true },
    { key: 'assignee', label: 'Assignee', kind: 'text' },
    { key: 'filingDate', label: 'Filing date', kind: 'date' },
    { key: 'grantDate', label: 'Grant date', kind: 'date' },
    {
      key: 'status',
      label: 'Status',
      kind: 'select',
      options: opts('pending', 'granted', 'expired', 'rejected'),
    },
  ],
  other: [
    { key: 'description', label: 'Description', kind: 'text' },
    { key: 'customType', label: 'Custom type (e.g. Poster, Software)', kind: 'text' },
  ],
};
