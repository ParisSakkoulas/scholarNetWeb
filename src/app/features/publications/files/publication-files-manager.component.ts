import { Component, computed, effect, inject, input, model, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { catchError, of } from 'rxjs';

import {
  FILE_ACCESS_HINT,
  FILE_ACCESS_LABEL,
  FILE_ROLE_LABEL,
  FILE_VERSION_LABEL,
  FileAccessMode,
  FileOptions,
  FileRole,
  FileVersion,
  PublicationFile,
  QueuedFile,
} from '../../../core/models/publication-file.model';
import {
  ALLOWED_FILE_EXTENSIONS,
  DEFAULT_MAX_FILE_MB,
  PublicationFilesService,
} from '../../../core/services/publication-files.service';
import { PdfViewerDialogComponent } from './pdf-viewer-dialog.component';
import {
  apiMessage,
  fileIcon,
  formatSize,
  fromIsoDay,
  isPdf,
  toIsoDay,
  validateFile,
} from './file-utils';

const entries = <T extends string>(labels: Record<T, string>) =>
  (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));

/**
 * Upload and manage the files of a publication (uploader only).
 *  - with `publicationId`: uploads, edits and deletes through the API;
 *  - without (publication not created yet): collects files in `queue`, which the form
 *    uploads once the publication exists.
 */
@Component({
  selector: 'app-publication-files-manager',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    ProgressBarModule,
    SelectModule,
    TagModule,
    PdfViewerDialogComponent,
  ],
  templateUrl: './publication-files-manager.component.html',
})
export class PublicationFilesManagerComponent {
  private readonly api = inject(PublicationFilesService);

  readonly publicationId = input<string | null>(null);
  readonly queue = model<QueuedFile[]>([]);

  readonly live = computed(() => !!this.publicationId());

  readonly files = signal<PublicationFile[]>([]);
  readonly loading = signal(false);
  readonly notice = signal<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // ---- staging area (picked, not added yet) ----
  readonly staged = signal<File[]>([]);
  readonly dragging = signal(false);
  readonly uploading = signal(false);
  readonly progress = signal<Record<string, number>>({});

  readonly accept = ALLOWED_FILE_EXTENSIONS.join(',');
  readonly maxMb = DEFAULT_MAX_FILE_MB;
  readonly accessOptions = entries(FILE_ACCESS_LABEL);
  readonly roleOptions = [{ value: null, label: 'Automatic (by file type)' }, ...entries(FILE_ROLE_LABEL)];
  readonly versionOptions = [{ value: null, label: 'Not specified' }, ...entries(FILE_VERSION_LABEL)];
  readonly accessLabel = FILE_ACCESS_LABEL;
  readonly accessHint = FILE_ACCESS_HINT;
  readonly roleLabel = FILE_ROLE_LABEL;
  readonly versionLabel = FILE_VERSION_LABEL;
  readonly formatSize = formatSize;
  readonly fileIcon = fileIcon;
  readonly isPdf = isPdf;
  readonly viewing = signal<PublicationFile | null>(null);
  readonly today = new Date();

  readonly options = new FormGroup({
    accessMode: new FormControl<FileAccessMode>('public', { nonNullable: true }),
    role: new FormControl<FileRole | null>(null),
    version: new FormControl<FileVersion | null>(null),
    embargo: new FormControl<Date | null>(null),
  });

  // ---- editing an uploaded file ----
  readonly editingId = signal<string | null>(null);
  readonly editForm = new FormGroup({
    accessMode: new FormControl<FileAccessMode>('public', { nonNullable: true }),
    role: new FormControl<FileRole>('fulltext', { nonNullable: true }),
    version: new FormControl<FileVersion | null>(null),
    embargo: new FormControl<Date | null>(null),
  });
  readonly editRoleOptions = entries(FILE_ROLE_LABEL);
  readonly saving = signal(false);
  readonly confirmingId = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.publicationId();
      untracked(() => (id ? this.load(id) : this.files.set([])));
    });
  }

  // ---------------- loading ----------------

  private load(id: string): void {
    this.loading.set(true);
    this.api
      .list(id)
      .pipe(catchError(() => of(null)))
      .subscribe((list) => {
        this.loading.set(false);
        if (list) this.files.set(list);
        else this.fail('Could not load the files.');
      });
  }

  // ---------------- picking ----------------

  onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.stage(Array.from(input.files ?? []));
    input.value = ''; // allow picking the same file again later
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.stage(Array.from(event.dataTransfer?.files ?? []));
  }

  private stage(picked: File[]): void {
    const problems: string[] = [];
    const ok: File[] = [];
    for (const f of picked) {
      const problem = validateFile(f);
      if (problem) problems.push(problem);
      else if (![...this.staged(), ...ok].some((x) => x.name === f.name && x.size === f.size)) ok.push(f);
    }
    if (ok.length) this.staged.update((list) => [...list, ...ok]);
    if (problems.length) this.fail(problems.join(' '));
    else this.notice.set(null);
  }

  unstage(index: number): void {
    this.staged.update((list) => list.filter((_, i) => i !== index));
  }

  // ---------------- adding ----------------

  private currentOptions(): FileOptions {
    const o = this.options.getRawValue();
    return {
      accessMode: o.accessMode,
      ...(o.role && { role: o.role }),
      ...(o.version && { version: o.version }),
      ...(o.embargo && { embargoUntil: toIsoDay(o.embargo)! }),
    };
  }

  /** Create dialog: queue them. Existing publication: upload one after another. */
  async addStaged(): Promise<void> {
    const files = this.staged();
    if (!files.length) return;
    const options = this.currentOptions();
    const id = this.publicationId();

    if (!id) {
      this.queue.update((q) => [...q, ...files.map((file) => ({ file, options }))]);
      this.staged.set([]);
      this.notice.set({ kind: 'ok', text: 'Queued. The files upload when you press Create.' });
      return;
    }

    this.uploading.set(true);
    this.notice.set(null);
    const failures: string[] = [];
    let added = 0;
    for (const file of files) {
      try {
        await this.uploadOne(id, file, options);
        added++;
        this.staged.update((list) => list.filter((f) => f !== file));
      } catch (err) {
        failures.push(`"${file.name}": ${apiMessage(err)}`);
      }
    }
    this.uploading.set(false);
    this.progress.set({});
    if (added) this.load(id);
    if (failures.length) this.fail(failures.join(' '));
    else this.notice.set({ kind: 'ok', text: added === 1 ? 'File uploaded.' : `${added} files uploaded.` });
  }

  private uploadOne(id: string, file: File, options: FileOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      this.api.upload(id, file, options).subscribe({
        next: (e) => {
          if (e.kind === 'progress') this.progress.update((p) => ({ ...p, [file.name]: e.percent }));
        },
        error: reject,
        complete: resolve,
      });
    });
  }

  removeQueued(index: number): void {
    this.queue.update((q) => q.filter((_, i) => i !== index));
  }

  // ---------------- edit / delete ----------------

  startEdit(f: PublicationFile): void {
    this.editForm.reset({
      accessMode: f.accessMode,
      role: f.role,
      version: f.version ?? null,
      embargo: fromIsoDay(f.embargoUntil),
    });
    this.editingId.set(f._id);
  }

  saveEdit(): void {
    const pubId = this.publicationId();
    const fileId = this.editingId();
    if (!pubId || !fileId) return;
    const v = this.editForm.getRawValue();
    this.saving.set(true);
    this.api
      .update(pubId, fileId, {
        accessMode: v.accessMode,
        role: v.role,
        ...(v.version && { version: v.version }),
        // an empty string is how the API removes an embargo
        embargoUntil: toIsoDay(v.embargo) ?? '',
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.files.update((list) => list.map((f) => (f._id === updated._id ? updated : f)));
          this.editingId.set(null);
          this.notice.set({ kind: 'ok', text: 'File updated.' });
        },
        error: (err) => {
          this.saving.set(false);
          this.fail(apiMessage(err));
        },
      });
  }

  remove(f: PublicationFile): void {
    if (this.confirmingId() !== f._id) {
      this.confirmingId.set(f._id);
      return;
    }
    this.confirmingId.set(null);
    const pubId = this.publicationId();
    if (!pubId) return;
    this.api.remove(pubId, f._id).subscribe({
      next: () => {
        this.files.update((list) => list.filter((x) => x._id !== f._id));
        this.notice.set({ kind: 'ok', text: 'File deleted.' });
      },
      error: (err) => this.fail(apiMessage(err)),
    });
  }

  embargoActive(f: PublicationFile): boolean {
    return !!f.embargoUntil && new Date(f.embargoUntil) > new Date();
  }

  private fail(text: string): void {
    this.notice.set({ kind: 'error', text });
  }
}
