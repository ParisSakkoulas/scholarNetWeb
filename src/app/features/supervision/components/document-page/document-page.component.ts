import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';

import {
  PdfSource,
  PdfViewerDialogComponent,
} from '../../../publications/files/pdf-viewer-dialog.component';
import {
  DOCUMENT_STATUS_META,
  DocumentStatus,
  DocumentVersion,
  ThesisDocumentDetail,
} from '../../models/supervision.model';
import { SupervisionService } from '../../services/supervision.service';
import { DocumentCommentsComponent } from '../document-comments/document-comments.component';

const MAX_UPLOAD_MB = 25;

/** One uploaded document: versions, status actions, PDF preview and the comment threads. */
@Component({
  selector: 'app-document-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    PdfViewerDialogComponent,
    DocumentCommentsComponent,
  ],
  templateUrl: './document-page.component.html',
})
export class DocumentPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(SupervisionService);
  private readonly messages = inject(MessageService);

  readonly supervisionId = this.route.snapshot.paramMap.get('id')!;
  readonly docId = this.route.snapshot.paramMap.get('docId')!;

  readonly doc = signal<ThesisDocumentDetail | null>(null);
  readonly readOnly = signal(false);
  readonly loading = signal(true);
  readonly selected = signal<number | null>(null);
  readonly uploading = signal(false);
  readonly previewing = signal(false);
  readonly statusMeta = DOCUMENT_STATUS_META;

  note = '';

  readonly isStudent = computed(() => this.doc()?.role === 'student');
  readonly isSupervisor = computed(() => this.doc()?.role === 'supervisor');

  readonly version = computed<DocumentVersion | null>(
    () => this.doc()?.versions.find((v) => v.number === this.selected()) ?? null,
  );
  readonly versionOptions = computed(() =>
    (this.doc()?.versions ?? []).map((v) => ({
      value: v.number,
      label: `v${v.number}${v.number === this.doc()?.currentVersion ? ' (latest)' : ''} · ${new Date(v.createdAt).toLocaleDateString()}`,
    })),
  );
  readonly isPdf = computed(() => this.version()?.mimeType === 'application/pdf');

  /** the student uploads their work; a supervisor can upload a reviewed copy (annotated outside the app) */
  readonly canUpload = computed(() => !!this.doc() && !this.readOnly());
  readonly canMarkReady = computed(
    () => this.isStudent() &&
      this.canUpload() &&
      ['draft', 'changes_requested'].includes(this.doc()?.status ?? '') &&
      (this.doc()?.currentVersion ?? 0) > 0,
  );
  readonly canReview = computed(
    () => this.isSupervisor() && !this.readOnly() && this.doc()?.status === 'ready_for_review',
  );

  /** What the shared PDF viewer needs, bound to the selected version. */
  readonly pdfSource = computed<PdfSource | null>(() => {
    const v = this.version();
    if (!v) return null;
    return {
      fetch: () => this.service.versionBlob(this.docId, v.number),
      download: () => this.service.downloadVersion(this.docId, v.number, v.fileName ?? 'document'),
    };
  });

  ngOnInit(): void {
    this.service.overview(this.supervisionId).subscribe({
      next: (o) => this.readOnly.set(['ended', 'declined'].includes(o.supervision.status)),
    });
    this.load();
  }

  private fail(summary: string) {
    return (err: { error?: { message?: string } }) =>
      this.messages.add({ severity: 'error', summary, detail: err?.error?.message });
  }

  load(): void {
    this.service.document(this.docId).subscribe({
      next: (d) => {
        // the co-working document has its own page
        if (d.mode === 'editor') {
          this.router.navigate(['/main/supervision', this.supervisionId, 'workspace'], { replaceUrl: true });
          return;
        }
        this.doc.set(d);
        this.loading.set(false);
        // keep the chosen version across reloads, otherwise open the latest
        const keep = this.selected();
        this.selected.set(
          keep && d.versions.some((v) => v.number === keep) ? keep : d.currentVersion || null,
        );
      },
      error: (err) => {
        this.loading.set(false);
        this.fail('Could not open this document')(err);
        this.router.navigate(['/main/supervision', this.supervisionId]);
      },
    });
  }

  selectVersion(n: number): void {
    this.selected.set(n);
  }

  // ---------------- file ----------------

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!/\.(pdf|docx?)$/i.test(file.name)) {
      this.messages.add({ severity: 'warn', summary: 'Only PDF and Word (.doc, .docx) files are accepted.' });
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      this.messages.add({ severity: 'warn', summary: `The file is larger than ${MAX_UPLOAD_MB} MB.` });
      return;
    }

    this.uploading.set(true);
    this.service.uploadVersion(this.docId, file, this.note).subscribe({
      next: (v) => {
        this.uploading.set(false);
        this.note = '';
        this.selected.set(v.number);
        this.messages.add({ severity: 'success', summary: `Version ${v.number} uploaded` });
        this.load();
      },
      error: (err) => {
        this.uploading.set(false);
        this.fail('Upload failed')(err);
      },
    });
  }

  download(): void {
    const v = this.version();
    if (!v) return;
    this.service
      .downloadVersion(this.docId, v.number, v.fileName ?? 'document')
      .subscribe({ error: this.fail('Could not download the file') });
  }

  // ---------------- status ----------------

  setStatus(status: DocumentStatus): void {
    this.service.setDocumentStatus(this.docId, status).subscribe({
      next: () => {
        this.messages.add({
          severity: 'success',
          summary:
            status === 'ready_for_review'
              ? 'Sent for review'
              : status === 'reviewed'
                ? 'Marked as reviewed'
                : 'Changes requested',
        });
        this.load();
      },
      error: this.fail('Could not change the status'),
    });
  }
}
