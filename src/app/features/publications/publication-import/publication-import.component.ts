import { Component, computed, EventEmitter, inject, Output, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { firstValueFrom } from 'rxjs';

import {
  IMPORT_SOURCE_LABEL,
  ImportAuthorCandidate,
  ImportAuthorWork,
  ImportLookup,
  ImportSource,
  Publication,
  PUBLICATION_TYPE_LABEL,
  PUBLICATION_VISIBILITY_LABEL,
  PublicationVisibility,
} from '../../../core/models/publication.model';
import { PublicationsService } from '../../../core/services/publications.service';

/** Import by DOI: look it up, preview what OpenAlex and DBLP have, import the one the user picks. */
@Component({
  selector: 'app-publication-import',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    DialogModule,
    InputTextModule,
    SelectModule,
    SelectButtonModule,
    ButtonModule,
  ],
  templateUrl: './publication-import.component.html',
})
export class PublicationImportComponent {
  @Output() imported = new EventEmitter<{ publication: Publication; warnings: string[] }>();
  /** `close` is false when some works failed, so the dialog stays open to show why. */
  @Output() importedMany = new EventEmitter<{ count: number; close: boolean }>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly service = inject(PublicationsService);

  readonly doi = new FormControl('', { nonNullable: true });
  readonly visibility = new FormControl<PublicationVisibility>('public', { nonNullable: true });
  readonly visibilityOptions = Object.entries(PUBLICATION_VISIBILITY_LABEL).map(([value, label]) => ({
    value,
    label,
  }));

  readonly sources: ImportSource[] = ['openalex', 'dblp'];
  readonly sourceLabel = IMPORT_SOURCE_LABEL;
  readonly typeLabel = PUBLICATION_TYPE_LABEL;

  readonly lookup = signal<ImportLookup | null>(null);
  readonly searching = signal(false);
  /** the source being imported, to show its spinner */
  readonly importing = signal<ImportSource | null>(null);
  readonly error = signal<string | null>(null);

  search(): void {
    const doi = this.doi.value.trim();
    if (!doi || this.searching()) return;
    this.searching.set(true);
    this.error.set(null);
    this.lookup.set(null);

    this.service.lookupDoi(doi).subscribe({
      next: (r) => {
        this.lookup.set(r);
        this.searching.set(false);
      },
      error: (err) => {
        this.error.set(this.message(err, 'Could not look up this DOI.'));
        this.searching.set(false);
      },
    });
  }

  import(source: ImportSource): void {
    const found = this.lookup();
    if (!found || this.importing()) return;
    this.importing.set(source);
    this.error.set(null);

    this.service.importDoi(found.doi, source, this.visibility.value).subscribe({
      next: (r) => {
        this.importing.set(null);
        this.imported.emit({ publication: r.publication, warnings: r.warnings });
      },
      error: (err) => {
        this.error.set(this.message(err, 'Could not import this publication.'));
        this.importing.set(null);
      },
    });
  }

  // ---------------- by author name ----------------

  readonly mode = signal<'doi' | 'author'>('doi');
  readonly modeOptions = [
    { label: 'By DOI', value: 'doi' },
    { label: 'By author name', value: 'author' },
  ];

  readonly authorName = new FormControl('', { nonNullable: true });
  readonly candidates = signal<ImportAuthorCandidate[] | null>(null);
  readonly pickedAuthor = signal<ImportAuthorCandidate | null>(null);
  readonly works = signal<ImportAuthorWork[]>([]);
  readonly worksTotal = signal(0);
  private worksPage = 0;
  readonly selected = signal<ReadonlySet<string>>(new Set());
  readonly loadingAuthors = signal(false);
  readonly loadingWorks = signal(false);
  /** `done of total` while the selected works are being imported one by one */
  readonly progress = signal<{ done: number; total: number } | null>(null);

  readonly canLoadMore = computed(() => this.works().length < this.worksTotal());
  readonly importable = computed(() => this.works().filter((w) => !w.existing));

  setMode(mode: 'doi' | 'author'): void {
    this.mode.set(mode);
    this.error.set(null);
  }

  searchAuthors(): void {
    const name = this.authorName.value.trim();
    if (name.length < 2 || this.loadingAuthors()) return;
    this.loadingAuthors.set(true);
    this.error.set(null);
    this.candidates.set(null);
    this.pickedAuthor.set(null);

    this.service.searchImportAuthors(name).subscribe({
      next: (list) => {
        this.candidates.set(list);
        this.loadingAuthors.set(false);
      },
      error: (err) => {
        this.error.set(this.message(err, 'Could not search for authors.'));
        this.loadingAuthors.set(false);
      },
    });
  }

  pickAuthor(a: ImportAuthorCandidate): void {
    this.pickedAuthor.set(a);
    this.works.set([]);
    this.worksTotal.set(0);
    this.worksPage = 0;
    this.selected.set(new Set());
    this.loadMoreWorks();
  }

  backToCandidates(): void {
    this.pickedAuthor.set(null);
    this.error.set(null);
  }

  loadMoreWorks(): void {
    const author = this.pickedAuthor();
    if (!author || this.loadingWorks()) return;
    this.loadingWorks.set(true);
    this.error.set(null);

    this.service.importAuthorWorks(author.id, this.worksPage + 1).subscribe({
      next: (r) => {
        this.worksPage = r.page;
        this.worksTotal.set(r.total);
        this.works.update((list) => [...list, ...r.works]);
        this.loadingWorks.set(false);
      },
      error: (err) => {
        this.error.set(this.message(err, 'Could not load the publications.'));
        this.loadingWorks.set(false);
      },
    });
  }

  toggle(doi: string): void {
    this.selected.update((s) => {
      const next = new Set(s);
      next.has(doi) ? next.delete(doi) : next.add(doi);
      return next;
    });
  }

  toggleAll(): void {
    const all = this.importable().map((w) => w.doi);
    this.selected.set(this.selected().size === all.length ? new Set() : new Set(all));
  }

  /** Imports the ticked works one at a time through the same endpoint as the DOI import. */
  async importSelected(): Promise<void> {
    const dois = [...this.selected()];
    if (!dois.length || this.progress()) return;
    this.error.set(null);
    this.progress.set({ done: 0, total: dois.length });

    const failed: string[] = [];
    let created = 0;
    for (const doi of dois) {
      try {
        await firstValueFrom(this.service.importDoi(doi, 'openalex', this.visibility.value));
        created++;
        this.works.update((l) => l.map((w) => (w.doi === doi ? { ...w, existing: true } : w)));
      } catch (err) {
        failed.push(`${doi}: ${this.message(err, 'failed')}`);
      }
      this.progress.update((p) => p && { ...p, done: p.done + 1 });
    }
    this.progress.set(null);
    this.selected.set(new Set(failed.length ? dois.filter((d) => failed.some((f) => f.startsWith(d))) : []));

    if (failed.length) this.error.set(`${failed.length} could not be imported. ${failed.join(' ')}`);
    if (created) this.importedMany.emit({ count: created, close: !failed.length });
  }

  /** The first author names, for the preview. */
  authorNames(names: { name: string }[]): string {
    const head = names.slice(0, 5).map((a) => a.name).join(', ');
    return names.length > 5 ? `${head} +${names.length - 5} more` : head;
  }

  private message(err: any, fallback: string): string {
    const msg = err?.error?.message;
    return Array.isArray(msg) ? msg.join(' ') : (msg ?? fallback);
  }
}
