import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';

import {
  DOCUMENT_STATUS_META,
  Milestone,
  ThesisDocument,
} from '../../models/supervision.model';
import { SupervisionService } from '../../services/supervision.service';

/**
 * Documents of a supervision. Drop it on any page: give it `milestoneId` (or `meetingId`) to
 * show only that milestone's/meeting's documents, and new ones are attached to it.
 */
@Component({
  selector: 'app-documents-section',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    TagModule,
  ],
  templateUrl: './documents-section.component.html',
})
export class DocumentsSectionComponent {
  private readonly service = inject(SupervisionService);
  private readonly messages = inject(MessageService);

  readonly supervisionId = input.required<string>();
  readonly milestoneId = input<string | null>(null);
  readonly meetingId = input<string | null>(null);
  /** Only the student creates documents; the others just read and review. */
  readonly canCreate = input(false);
  /** Offered in the "new document" dialog when the section is not tied to one milestone. */
  readonly milestones = input<Milestone[]>([]);

  readonly docs = signal<ThesisDocument[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly dialog = signal(false);
  readonly saving = signal(false);
  readonly statusMeta = DOCUMENT_STATUS_META;

  title = '';
  note = '';
  file: File | null = null;
  pickedMilestone: string | null = null;

  readonly milestoneOptions = computed(() =>
    this.milestones().map((m) => ({ value: m._id, label: m.title })),
  );
  private readonly milestoneTitles = computed(
    () => new Map(this.milestones().map((m) => [m._id, m.title])),
  );

  constructor() {
    effect(() => {
      // reload when the section is pointed at another milestone/meeting
      this.milestoneId();
      this.meetingId();
      this.load();
    });
  }

  milestoneTitle(d: ThesisDocument): string | null {
    return d.milestoneId ? (this.milestoneTitles().get(d.milestoneId) ?? null) : null;
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.service
      .documents(this.supervisionId(), {
        milestoneId: this.milestoneId() ?? undefined,
        meetingId: this.meetingId() ?? undefined,
      })
      .subscribe({
        next: (list) => {
          this.docs.set(list);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!/\.(pdf|docx?)$/i.test(file.name)) {
      this.messages.add({ severity: 'warn', summary: 'Only PDF and Word (.doc, .docx) files are accepted.' });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      this.messages.add({ severity: 'warn', summary: 'The file is larger than 25 MB.' });
      return;
    }
    this.file = file;
    if (!this.title.trim()) this.title = file.name.replace(/\.[^.]+$/, '').slice(0, 200);
  }

  create(): void {
    const title = this.title.trim();
    if (!title || !this.file) return;
    this.saving.set(true);
    this.service
      .uploadNewDocument(
        this.supervisionId(),
        {
          title,
          milestoneId: this.milestoneId() ?? this.pickedMilestone ?? undefined,
          meetingId: this.meetingId() ?? undefined,
        },
        this.file,
        this.note,
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.dialog.set(false);
          this.title = '';
          this.note = '';
          this.file = null;
          this.pickedMilestone = null;
          this.messages.add({ severity: 'success', summary: 'File uploaded' });
          this.load();
        },
        error: (err) => {
          this.saving.set(false);
          this.messages.add({
            severity: 'error',
            summary: 'Could not upload the file',
            detail: err?.error?.message,
          });
          this.load();
        },
      });
  }
}
