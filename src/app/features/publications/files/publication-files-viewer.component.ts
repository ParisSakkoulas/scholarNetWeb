import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { catchError, of } from 'rxjs';

import {
  FILE_ACCESS_LABEL,
  FILE_ROLE_LABEL,
  FILE_VERSION_LABEL,
  PublicationFile,
} from '../../../core/models/publication-file.model';
import { PublicationFilesService } from '../../../core/services/publication-files.service';
import { PdfViewerDialogComponent } from './pdf-viewer-dialog.component';
import { apiMessage, fileIcon, formatSize, isPdf } from './file-utils';

/**
 * The files of a publication for whoever is looking at it: download when allowed, otherwise
 * the reason (embargo, uploader-only) or a way to ask the uploader for access.
 */
@Component({
  selector: 'app-publication-files-viewer',
  standalone: true,
  imports: [FormsModule, ButtonModule, TagModule, TextareaModule, PdfViewerDialogComponent],
  templateUrl: './publication-files-viewer.component.html',
})
export class PublicationFilesViewerComponent {
  private readonly api = inject(PublicationFilesService);

  readonly publicationId = input.required<string>();
  /** the viewer uploaded the publication, so every file is downloadable and no request applies */
  readonly isOwner = input(false);

  readonly files = signal<PublicationFile[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notice = signal<{ kind: 'ok' | 'error'; text: string } | null>(null);

  /** file id with an open "ask for access" box, its message, and which action is running */
  readonly requestingId = signal<string | null>(null);
  message = '';
  readonly busyId = signal<string | null>(null);

  readonly roleLabel = FILE_ROLE_LABEL;
  readonly versionLabel = FILE_VERSION_LABEL;
  readonly accessLabel = FILE_ACCESS_LABEL;
  readonly formatSize = formatSize;
  readonly fileIcon = fileIcon;
  readonly isPdf = isPdf;
  /** the PDF open in the viewer dialog */
  readonly viewing = signal<PublicationFile | null>(null);

  readonly hasFiles = computed(() => this.files().length > 0);

  constructor() {
    effect(() => {
      const id = this.publicationId();
      untracked(() => this.load(id));
    });
  }

  reload(): void {
    this.load(this.publicationId());
  }

  private load(id: string): void {
    this.loading.set(true);
    this.api
      .list(id)
      .pipe(catchError((err) => { this.error.set(apiMessage(err, 'Could not load the files.')); return of(null); }))
      .subscribe((list) => {
        this.loading.set(false);
        if (list) {
          this.error.set(null);
          this.files.set(list);
        }
      });
  }

  // ---------------- download ----------------

  download(f: PublicationFile): void {
    this.busyId.set(f._id);
    this.notice.set(null);
    this.api.download(this.publicationId(), f).subscribe({
      next: () => this.busyId.set(null),
      error: async (err) => {
        this.busyId.set(null);
        // a blob response hides the JSON error body, so read it back
        let text = 'Could not download the file.';
        try {
          const body = JSON.parse(await (err.error as Blob).text());
          text = Array.isArray(body.message) ? body.message.join(' ') : (body.message ?? text);
        } catch {
          /* keep the generic text */
        }
        this.notice.set({ kind: 'error', text });
        this.reload(); // access may have changed
      },
    });
  }

  // ---------------- access requests ----------------

  openRequest(f: PublicationFile): void {
    this.message = '';
    this.requestingId.set(f._id);
  }

  sendRequest(f: PublicationFile): void {
    this.busyId.set(f._id);
    this.api.requestAccess(this.publicationId(), f._id, this.message).subscribe({
      next: () => {
        this.busyId.set(null);
        this.requestingId.set(null);
        this.notice.set({ kind: 'ok', text: 'Request sent. The uploader was notified.' });
        this.reload();
      },
      error: (err) => {
        this.busyId.set(null);
        this.notice.set({ kind: 'error', text: apiMessage(err) });
      },
    });
  }

  cancelRequest(f: PublicationFile): void {
    if (!f.request) return;
    this.busyId.set(f._id);
    this.api.cancelRequest(f.request._id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.notice.set({ kind: 'ok', text: 'Request withdrawn.' });
        this.reload();
      },
      error: (err) => {
        this.busyId.set(null);
        this.notice.set({ kind: 'error', text: apiMessage(err) });
      },
    });
  }

  // ---------------- view helpers ----------------

  embargoActive(f: PublicationFile): boolean {
    return !!f.embargoUntil && new Date(f.embargoUntil) > new Date();
  }
}
