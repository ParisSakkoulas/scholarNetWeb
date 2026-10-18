import {
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { ChipsModule } from 'primeng/chips';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { catchError, of } from 'rxjs';

import { Publication } from '../../../core/models/publication.model';
import {
  DraftReference,
  PublicationReference,
  ReferenceImport,
  ReferenceInput,
} from '../../../core/models/reference.model';
import { PublicationsService } from '../../../core/services/publications.service';
import { ReferencesService } from '../../../core/services/references.service';

type AddMode = 'library' | 'manual' | 'import';

/** One line of the list, whether it comes from the API or from the create dialog's queue. */
interface RefRow {
  /** API id (live) or index in the queue (draft) */
  id: string;
  title: string;
  authors: string;
  year?: number;
  venue?: string;
  doi?: string;
  raw?: string;
  citedId?: string;
  source?: string;
  /** only metadata-only references can be edited in the queue */
  editable: boolean;
}

const apiMessage = (err: any, fallback = 'Something went wrong') => {
  const m = err?.error?.message;
  return Array.isArray(m) ? m.join(' ') : (m ?? fallback);
};

/**
 * The reference list of a publication.
 *  - with `publicationId`: reads/writes straight through the API;
 *  - without (publication not created yet): edits the `drafts` / `imports` queues, which the
 *    form sends once the publication exists.
 * `readonly` hides every control (detail page).
 */
@Component({
  selector: 'app-publication-references',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    ChipsModule,
    SelectModule,
    SelectButtonModule,
    AutoCompleteModule,
    TagModule,
  ],
  templateUrl: './publication-references.component.html',
})
export class PublicationReferencesComponent {
  private readonly references = inject(ReferencesService);
  private readonly publications = inject(PublicationsService);

  readonly publicationId = input<string | null>(null);
  readonly readonly = input(false);
  readonly drafts = model<DraftReference[]>([]);
  readonly imports = model<ReferenceImport[]>([]);

  readonly live = computed(() => !!this.publicationId());

  private readonly refs = signal<PublicationReference[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly notice = signal<{ kind: 'ok' | 'error'; text: string } | null>(null);

  readonly addOpen = signal(false);
  readonly mode = signal<AddMode>('library');
  readonly modeOptions = [
    { label: 'Find on scholarNet', value: 'library' },
    { label: 'DOI / manual', value: 'manual' },
    { label: 'Import BibTeX', value: 'import' },
  ];

  /** row id being edited, or null when adding */
  readonly editingId = signal<string | null>(null);
  /** row id waiting for a second click on "Remove" */
  readonly confirmingId = signal<string | null>(null);

  // ---- library search ----
  suggestions: Publication[] = [];
  picked: Publication | null = null;

  // ---- forms ----
  readonly manual = new FormGroup({
    doi: new FormControl('', { nonNullable: true }),
    title: new FormControl('', { nonNullable: true, validators: Validators.maxLength(500) }),
    authors: new FormControl<string[]>([], { nonNullable: true }),
    year: new FormControl<number | null>(null),
    venue: new FormControl('', { nonNullable: true }),
    raw: new FormControl('', { nonNullable: true }),
  });
  readonly importForm = new FormGroup({
    format: new FormControl<'bibtex' | 'text'>('bibtex', { nonNullable: true }),
    content: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });
  readonly formatOptions = [
    { label: 'BibTeX', value: 'bibtex' },
    { label: 'One reference per line', value: 'text' },
  ];

  readonly rows = computed<RefRow[]>(() => {
    if (this.live()) return this.refs().map((r) => this.liveRow(r));
    return this.drafts().map((d, i) => this.draftRow(d, i));
  });

  constructor() {
    // (re)load whenever the publication changes
    effect(() => {
      const id = this.publicationId();
      untracked(() => (id ? this.load(id) : this.refs.set([])));
    });
  }

  // ---------------- loading ----------------

  private load(id: string): void {
    this.loading.set(true);
    this.references
      .list(id)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res) this.refs.set(res.data);
        else this.fail('Could not load references.');
        this.loading.set(false);
      });
  }

  // ---------------- add / edit ----------------

  openAdd(): void {
    this.resetForms();
    this.addOpen.set(true);
  }

  closeAdd(): void {
    this.addOpen.set(false);
    this.resetForms();
  }

  searchLibrary(event: AutoCompleteCompleteEvent): void {
    const q = event.query.trim();
    if (!q) {
      this.suggestions = [];
      return;
    }
    this.publications
      .search({ q, limit: 8 })
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        const self = this.publicationId();
        this.suggestions = (res?.data ?? []).filter((p) => p._id !== self);
      });
  }

  addFromLibrary(): void {
    const p = this.picked;
    if (!p) return;
    this.submitInput({ citedPublicationId: p._id }, p.title);
  }

  submitManual(): void {
    const v = this.manual.getRawValue();
    const input: ReferenceInput = {
      ...(v.doi.trim() && { doi: v.doi.trim() }),
      ...(v.title.trim() && { title: v.title.trim() }),
      ...(v.authors.length && { authors: v.authors }),
      ...(v.year && { year: Number(v.year) }),
      ...(v.venue.trim() && { venue: v.venue.trim() }),
      ...(v.raw.trim() && { raw: v.raw.trim() }),
    };
    if (!input.doi && !input.title && !input.raw) {
      this.fail('Enter a DOI, a title or the full citation text.');
      return;
    }
    const editing = this.editingId();
    if (editing !== null) this.saveEdit(editing, input);
    else this.submitInput(input);
  }

  submitImport(): void {
    if (this.importForm.invalid) return;
    const body = this.importForm.getRawValue() as ReferenceImport;
    const id = this.publicationId();
    if (!id) {
      this.imports.update((list) => [...list, body]);
      this.notify('Import queued. It runs when you save the publication.');
      this.closeAdd();
      return;
    }
    this.busy.set(true);
    this.references.importReferences(id, body).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.notify(`Found ${res.found}, added ${res.added} new.`);
        this.closeAdd();
        this.load(id);
      },
      error: (err) => this.failBusy(err),
    });
  }

  private submitInput(input: ReferenceInput, label?: string): void {
    const id = this.publicationId();
    if (!id) {
      this.drafts.update((list) => [...list, { input, label }]);
      this.closeAdd();
      return;
    }
    this.busy.set(true);
    this.references.add(id, input).subscribe({
      next: () => {
        this.busy.set(false);
        this.notify('Reference added.');
        this.closeAdd();
        this.load(id);
      },
      error: (err) => this.failBusy(err),
    });
  }

  startEdit(row: RefRow): void {
    this.mode.set('manual');
    this.manual.reset({
      doi: row.doi ?? '',
      title: row.citedId ? row.title : (row.title === row.raw ? '' : row.title),
      authors: row.authors ? row.authors.split(', ') : [],
      year: row.year ?? null,
      venue: row.venue ?? '',
      raw: row.raw ?? '',
    });
    this.editingId.set(row.id);
    this.addOpen.set(true);
  }

  private saveEdit(rowId: string, input: ReferenceInput): void {
    const id = this.publicationId();
    if (!id) {
      this.drafts.update((list) =>
        list.map((d, i) => (String(i) === rowId ? { input } : d)),
      );
      this.closeAdd();
      return;
    }
    this.busy.set(true);
    this.references.update(id, rowId, input).subscribe({
      next: () => {
        this.busy.set(false);
        this.notify('Reference updated.');
        this.closeAdd();
        this.load(id);
      },
      error: (err) => this.failBusy(err),
    });
  }

  // ---------------- remove / sync ----------------

  remove(row: RefRow): void {
    if (this.confirmingId() !== row.id) {
      this.confirmingId.set(row.id);
      return;
    }
    this.confirmingId.set(null);
    const id = this.publicationId();
    if (!id) {
      this.drafts.update((list) => list.filter((_, i) => String(i) !== row.id));
      return;
    }
    this.references.remove(id, row.id).subscribe({
      next: () => {
        this.refs.update((list) => list.filter((r) => r._id !== row.id));
        this.notify('Reference removed.');
      },
      error: (err) => this.fail(apiMessage(err)),
    });
  }

  removeImport(index: number): void {
    this.imports.update((list) => list.filter((_, i) => i !== index));
  }

  sync(): void {
    const id = this.publicationId();
    if (!id) return;
    this.busy.set(true);
    this.references.sync(id).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.notify(
          `OpenAlex lists ${res.total} references: ${res.added} added` +
            (res.skippedDeleted ? `, ${res.skippedDeleted} skipped because you removed them.` : '.'),
        );
        this.load(id);
      },
      error: (err) => this.failBusy(err),
    });
  }

  // ---------------- helpers ----------------

  private liveRow(r: PublicationReference): RefRow {
    const s = r.snapshot ?? {};
    const cited = r.cited;
    return {
      id: r._id,
      title: cited?.title ?? s.title ?? r.raw ?? 'Untitled reference',
      authors: (cited?.authors?.map((a) => a.name) ?? s.authors ?? []).join(', '),
      year: cited?.year ?? s.year,
      venue: s.venue,
      doi: cited?.identifiers?.doi ?? s.doi,
      raw: r.raw,
      citedId: cited?._id,
      source: r.source,
      editable: true,
    };
  }

  private draftRow(d: DraftReference, i: number): RefRow {
    const x = d.input;
    return {
      id: String(i),
      title: d.label ?? x.title ?? x.raw ?? x.doi ?? 'Untitled reference',
      authors: (x.authors ?? []).join(', '),
      year: x.year,
      venue: x.venue,
      doi: x.doi,
      raw: x.raw,
      source: 'manual',
      editable: !x.citedPublicationId,
    };
  }

  private resetForms(): void {
    this.mode.set('library');
    this.editingId.set(null);
    this.picked = null;
    this.suggestions = [];
    this.manual.reset({ doi: '', title: '', authors: [], year: null, venue: '', raw: '' });
    this.importForm.reset({ format: 'bibtex', content: '' });
  }

  private notify(text: string): void {
    this.notice.set({ kind: 'ok', text });
  }

  private fail(text: string): void {
    this.notice.set({ kind: 'error', text });
  }

  private failBusy(err: unknown): void {
    this.busy.set(false);
    this.fail(apiMessage(err));
  }
}
