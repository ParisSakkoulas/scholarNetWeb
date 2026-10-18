import {
  ALLOWED_FILE_EXTENSIONS,
  DEFAULT_MAX_FILE_MB,
} from '../../../core/services/publication-files.service';

export const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/** PrimeIcons class for a file name. */
export const fileIcon = (name: string): string =>
  name.toLowerCase().endsWith('.pdf') ? 'pi pi-file-pdf' : 'pi pi-file';

/** First problem with a picked file, or null. The API repeats these checks on the content. */
export function validateFile(file: File): string | null {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
    return `"${file.name}" is not allowed. Use ${ALLOWED_FILE_EXTENSIONS.join(', ')}.`;
  }
  if (file.size > DEFAULT_MAX_FILE_MB * 1024 * 1024) {
    return `"${file.name}" is larger than ${DEFAULT_MAX_FILE_MB} MB.`;
  }
  if (file.size === 0) return `"${file.name}" is empty.`;
  return null;
}

export const apiMessage = (err: any, fallback = 'Something went wrong'): string => {
  const m = err?.error?.message;
  return Array.isArray(m) ? m.join(' ') : (m ?? fallback);
};

export const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Date from the picker -> yyyy-MM-dd (local day). */
export const toIsoDay = (d: Date | null): string | null =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    : null;

/** ISO date from the API -> Date for the picker. */
export const fromIsoDay = (v?: string | null): Date | null => {
  if (!v) return null;
  const [y, m, d] = v.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Only PDFs can be shown in the app (slides are download-only). */
export const isPdf = (f: { name: string; mimeType?: string }): boolean =>
  f.mimeType === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
