import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DatePipe } from '@angular/common';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';

import {
  PUBLICATION_TYPE_LABEL,
  PUBLICATION_VISIBILITY_LABEL,
  Publication,
  TYPE_FIELDS,
} from '../../../core/models/publication.model';
import { AuthService } from '../../../core/services/auth.service';
import { PublicationsService } from '../../../core/services/publications.service';
import { CitedWork } from '../../../core/models/reference.model';
import { ReferencesService } from '../../../core/services/references.service';
import { PublicationFilesViewerComponent } from '../files/publication-files-viewer.component';
import { PublicationReferencesComponent } from '../publication-references/publication-references.component';
import { AuthorStatusBadgeComponent } from '../author-status-badge/author-status-badge.component';
import { PublicationFormComponent } from '../publication-form/publication-form.component';
import { RatingComponent } from '../../../shared/components/ui/rating/rating.component';

@Component({
  selector: 'app-publication-detail',
  imports: [
    RouterLink,
    DatePipe,
    AvatarModule,
    ButtonModule,
    TagModule,
    ConfirmDialogModule,
    PublicationFormComponent,
    AuthorStatusBadgeComponent,
    PublicationReferencesComponent,
    PublicationFilesViewerComponent,
    RatingComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './publication-detail.component.html',
})
export class PublicationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(PublicationsService);
  private readonly referencesApi = inject(ReferencesService);
  private readonly auth = inject(AuthService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

  readonly publication = signal<Publication | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly editing = signal(false);
  readonly editTab = signal<'details' | 'references' | 'files'>('details');
  /** bumped to reload the file list after the dialog changed it */
  readonly filesVersion = signal(0);
  /** bumped to rebuild the read-only reference list after the dialog changed it */
  readonly refsVersion = signal(0);
  readonly citedBy = signal<CitedWork[]>([]);
  readonly citedByTotal = signal(0);

  readonly typeLabel = PUBLICATION_TYPE_LABEL;
  readonly visibilityLabel = PUBLICATION_VISIBILITY_LABEL;

  readonly isOwner = computed(
    () =>
      !!this.publication() &&
      this.publication()!.uploadedBy?._id === this.auth.currentUser()?.id,
  );

  readonly uploaderInitials = computed(() => {
    const u = this.publication()?.uploadedBy;
    return `${u?.firstName?.[0] ?? ''}${u?.lastName?.[0] ?? ''}`.toUpperCase();
  });

  /** Type-specific rows that actually have a value. */
  readonly details = computed(() => {
    const p = this.publication();
    if (!p) return [];
    return TYPE_FIELDS[p.type]
      .map((f) => ({
        label: f.label,
        value: this.display(p[f.key], f.kind, f.options),
      }))
      .filter((d) => d.value !== '');
  });

  ngOnInit(): void {
    // the route is reused when navigating between publications (e.g. via a reference),
    // so react to param changes instead of reading the snapshot once
    this.route.paramMap.subscribe((params) => {
      const id = params.get('publicationId');
      if (id) this.load(id);
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.publication.set(null);
    this.citedBy.set([]);
    this.citedByTotal.set(0);
    this.editing.set(false);
    this.service.get(id).subscribe({
      next: (p) => {
        this.publication.set(p);
        this.loading.set(false);
        this.loadCitedBy(p._id);
        window.scrollTo({ top: 0 });
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Publication not found.');
        this.loading.set(false);
      },
    });
  }

  openEditor(tab: 'details' | 'references' | 'files'): void {
    this.editTab.set(tab);
    this.editing.set(true);
  }

  onSaved(p: Publication): void {
    this.editing.set(false);
    this.publication.set(p);
    this.refsVersion.update((v) => v + 1);
    this.filesVersion.update((v) => v + 1);
    this.loadCitedBy(p._id);
    this.messages.add({ severity: 'success', summary: 'Publication updated' });
  }

  /** the dialog was closed; references are saved immediately there, so refresh them */
  onEditorClosed(): void {
    this.editing.set(false);
    this.refsVersion.update((v) => v + 1);
    this.filesVersion.update((v) => v + 1);
  }

  private loadCitedBy(id: string): void {
    this.referencesApi.citedBy(id, 1, 10).subscribe({
      next: (res) => {
        this.citedBy.set(res.data);
        this.citedByTotal.set(res.total);
      },
      error: () => undefined,
    });
  }

  confirmDelete(): void {
    const p = this.publication();
    if (!p) return;
    this.confirmation.confirm({
      header: 'Delete publication',
      message: `Delete "${p.title}"? This can't be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary' },
      accept: () =>
        this.service.remove(p._id).subscribe({
          next: () => this.router.navigate(['/main/publications']),
          error: (err) =>
            this.messages.add({
              severity: 'error',
              summary: 'Could not delete',
              detail: err?.error?.message ?? 'Something went wrong',
            }),
        }),
    });
  }

  private display(
    value: unknown,
    kind: string,
    options?: { label: string; value: string }[],
  ): string {
    if (value == null || value === '') return '';
    if (kind === 'boolean') return value ? 'Yes' : 'No';
    if (kind === 'date') return new Date(value as string).toLocaleDateString();
    if (kind === 'select') {
      return options?.find((o) => o.value === value)?.label ?? String(value);
    }
    return String(value);
  }
}
