export type FileAccessMode = 'public' | 'restricted' | 'approval_based';
export type FileRole = 'fulltext' | 'supplementary' | 'slides' | 'poster' | 'data' | 'other';
export type FileVersion = 'preprint' | 'accepted' | 'published';
export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

export const FILE_ACCESS_LABEL: Record<FileAccessMode, string> = {
  public: 'Public',
  approval_based: 'On request',
  restricted: 'Only me',
};

export const FILE_ACCESS_HINT: Record<FileAccessMode, string> = {
  public: 'Anyone who can see the publication can download it.',
  approval_based: 'People must ask you for access, and you approve or decline.',
  restricted: 'Only you can download it.',
};

export const FILE_ROLE_LABEL: Record<FileRole, string> = {
  fulltext: 'Full text',
  supplementary: 'Supplementary',
  slides: 'Slides',
  poster: 'Poster',
  data: 'Data',
  other: 'Other',
};

export const FILE_VERSION_LABEL: Record<FileVersion, string> = {
  preprint: 'Preprint',
  accepted: 'Accepted manuscript',
  published: 'Published version',
};

/** A file of a publication, as returned by GET /publications/:id/files (never includes the storage key). */
export interface PublicationFile {
  _id: string;
  role: FileRole;
  name: string;
  mimeType: string;
  size: number;
  version?: FileVersion;
  embargoUntil?: string;
  accessMode: FileAccessMode;
  uploadedAt: string;
  /** can the signed-in user download it right now */
  canDownload: boolean;
  /** the signed-in user's own access request for it, if any */
  request: { _id: string; status: AccessRequestStatus } | null;
}

/** Fields sent next to the file (upload) or alone (edit). */
export interface FileOptions {
  role?: FileRole | null;
  accessMode?: FileAccessMode;
  version?: FileVersion | null;
  /** yyyy-MM-dd; an empty string removes the embargo on edit */
  embargoUntil?: string | null;
}

/** A file picked in the create dialog; uploaded once the publication exists. */
export interface QueuedFile {
  file: File;
  options: FileOptions;
}

/** Row of GET /file-requests/incoming and /file-requests/mine. */
export interface FileAccessRequest {
  _id: string;
  publication: string;
  fileId: string;
  publicationTitle: string;
  fileName: string;
  message?: string;
  status: AccessRequestStatus;
  decidedAt?: string | null;
  createdAt: string;
  /** populated on /incoming */
  requester?: { _id: string; firstName: string; lastName: string; username: string; profilePhotoUrl?: string };
  /** populated on /mine */
  owner?: { _id: string; firstName: string; lastName: string; username: string; profilePhotoUrl?: string };
}

export interface FileRequestPage {
  data: FileAccessRequest[];
  total: number;
  page: number;
  limit: number;
}
