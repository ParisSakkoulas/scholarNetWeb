import {
  HttpClient,
  HttpEvent,
  HttpEventType,
  HttpParams,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { filter, map, Observable } from 'rxjs';

import { environment } from '../../../environmets/environment';
import {
  AccessRequestStatus,
  FileAccessRequest,
  FileOptions,
  FileRequestPage,
  PublicationFile,
} from '../models/publication-file.model';

/** Progress or the finished upload. */
export type UploadEvent =
  | { kind: 'progress'; percent: number }
  | { kind: 'done'; file: PublicationFile };

/** Extensions the API accepts (it also checks the file content, not just the name). */
export const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.ppt', '.pptx'];
/** The API default; its real limit is MAX_FILE_SIZE_MB and is enforced there. */
export const DEFAULT_MAX_FILE_MB = 50;

@Injectable({ providedIn: 'root' })
export class PublicationFilesService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/publications`;
  private readonly requestsApi = `${environment.apiUrl}/file-requests`;

  // ---------------- files ----------------

  list(publicationId: string): Observable<PublicationFile[]> {
    return this.http.get<PublicationFile[]>(`${this.api}/${publicationId}/files`);
  }

  /** multipart/form-data with the file in the "file" field, as the API expects. */
  upload(
    publicationId: string,
    file: File,
    options: FileOptions = {},
  ): Observable<UploadEvent> {
    const body = new FormData();
    if (options.role) body.append('role', options.role);
    if (options.accessMode) body.append('accessMode', options.accessMode);
    if (options.version) body.append('version', options.version);
    if (options.embargoUntil) body.append('embargoUntil', options.embargoUntil);
    // the file goes last so the API has already parsed the text fields
    body.append('file', file, file.name);

    return this.http
      .post<PublicationFile>(`${this.api}/${publicationId}/files`, body, {
        observe: 'events',
        reportProgress: true,
      })
      .pipe(
        map((e: HttpEvent<PublicationFile>): UploadEvent | null => {
          if (e.type === HttpEventType.UploadProgress) {
            return {
              kind: 'progress',
              percent: e.total ? Math.round((100 * e.loaded) / e.total) : 0,
            };
          }
          if (e.type === HttpEventType.Response && e.body) {
            return { kind: 'done', file: e.body };
          }
          return null;
        }),
        filter((e): e is UploadEvent => e !== null),
      );
  }

  update(
    publicationId: string,
    fileId: string,
    options: FileOptions,
  ): Observable<PublicationFile> {
    return this.http.patch<PublicationFile>(
      `${this.api}/${publicationId}/files/${fileId}`,
      options,
    );
  }

  remove(publicationId: string, fileId: string): Observable<{ deleted: true }> {
    return this.http.delete<{ deleted: true }>(
      `${this.api}/${publicationId}/files/${fileId}`,
    );
  }

  /** The file's bytes, for in-app viewing. Same endpoint and access check as a download. */
  fetchBlob(publicationId: string, fileId: string): Observable<Blob> {
    return this.http.get(`${this.api}/${publicationId}/files/${fileId}/download`, {
      responseType: 'blob',
    });
  }

  /**
   * Downloads through fetch-style XHR so the JWT is sent (a plain link would not carry it),
   * then hands the blob to the browser as a normal download.
   */
  download(publicationId: string, file: Pick<PublicationFile, '_id' | 'name'>): Observable<void> {
    return this.http
      .get(`${this.api}/${publicationId}/files/${file._id}/download`, {
        responseType: 'blob',
      })
      .pipe(
        map((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          a.remove();
          // give the browser a moment to start the download before releasing the blob
          setTimeout(() => URL.revokeObjectURL(url), 10_000);
        }),
      );
  }

  // ---------------- access requests ----------------

  requestAccess(
    publicationId: string,
    fileId: string,
    message?: string,
  ): Observable<FileAccessRequest> {
    return this.http.post<FileAccessRequest>(
      `${this.api}/${publicationId}/files/${fileId}/request`,
      message?.trim() ? { message: message.trim() } : {},
    );
  }

  /** Requests for my files (I am the uploader). */
  incoming(
    status: AccessRequestStatus | null,
    page = 1,
    limit = 10,
  ): Observable<FileRequestPage> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (status) params = params.set('status', status);
    return this.http.get<FileRequestPage>(`${this.requestsApi}/incoming`, { params });
  }

  /** Requests I sent. */
  mine(page = 1, limit = 10): Observable<FileRequestPage> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<FileRequestPage>(`${this.requestsApi}/mine`, { params });
  }

  decide(
    requestId: string,
    decision: 'approve' | 'reject',
  ): Observable<FileAccessRequest> {
    return this.http.patch<FileAccessRequest>(`${this.requestsApi}/${requestId}`, {
      decision,
    });
  }

  /** Withdraw a request I sent. */
  cancelRequest(requestId: string): Observable<{ deleted: true }> {
    return this.http.delete<{ deleted: true }>(`${this.requestsApi}/${requestId}`);
  }
}
