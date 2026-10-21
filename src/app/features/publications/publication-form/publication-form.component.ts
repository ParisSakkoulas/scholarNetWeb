import {
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ChipsModule } from 'primeng/chips';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { TextareaModule } from 'primeng/textarea';
import { firstValueFrom, Observable } from 'rxjs';

import {
  PUBLICATION_TYPE_LABEL,
  PUBLICATION_VISIBILITY_LABEL,
  Publication,
  PublicationAuthor,
  PublicationType,
  PublicationVisibility,
  TYPE_FIELDS,
  TypeField,
} from '../../../core/models/publication.model';
import { UserSearchResult } from '../../teams/models/user-search.model';
import { AuthorPickerComponent } from '../author-picker/author-picker.component';
import { AuthorStatusBadgeComponent } from '../author-status-badge/author-status-badge.component';
import { AuthService } from '../../../core/services/auth.service';
import { DraftReference, ReferenceImport } from '../../../core/models/reference.model';
import { ReferencesService } from '../../../core/services/references.service';
import { QueuedFile } from '../../../core/models/publication-file.model';
import { PublicationFilesService } from '../../../core/services/publication-files.service';
import { PublicationFilesManagerComponent } from '../files/publication-files-manager.component';
import { PublicationReferencesComponent } from '../publication-references/publication-references.component';
import { PublicationsService } from '../../../core/services/publications.service';

const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

const memberName = (u: UserSearchResult) =>
  `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username;

/** ISO date from the API -> Date for the date picker (null when empty). */
const toDate = (v: unknown): Date | null => {
  if (typeof v !== 'string' || !v) return null;
  // read the calendar day as written, so timezones can't shift it
  const [y, m, d] = v.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Date from the picker -> yyyy-MM-dd (local day, no timezone shift). */
const fromDate = (d: Date | null): string | null =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    : null;

@Component({
  selector: 'app-publication-form',
  imports: [
    ReactiveFormsModule,
    DialogModule,
    DatePickerModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    CheckboxModule,
    ChipsModule,
    TabsModule,
    PublicationReferencesComponent,
    PublicationFilesManagerComponent,
    AuthorPickerComponent,
    AuthorStatusBadgeComponent,
    ButtonModule,
  ],
  templateUrl: './publication-form.component.html',
})
export class PublicationFormComponent implements OnInit {
  /** Pass a publication to edit it; leave empty to create. */
  @Input() publication: Publication | null = null;
  /** Which tab to open first. */
  @Input() startTab: 'details' | 'references' | 'files' = 'details';
  @Output() saved = new EventEmitter<Publication>();
  /** The publication was created but something after that failed, so the dialog stays open. */
  @Output() changed = new EventEmitter<Publication>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PublicationsService);
  private readonly auth = inject(AuthService);
  private readonly referencesApi = inject(ReferencesService);
  private readonly filesApi = inject(PublicationFilesService);

  readonly tab = signal<string>('details');
  /** references typed before the publication exists; sent right after it is created */
  readonly drafts = signal<DraftReference[]>([]);
  readonly pendingImports = signal<ReferenceImport[]>([]);
  /** files picked before the publication exists; uploaded right after it is created */
  readonly fileQueue = signal<QueuedFile[]>([]);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly typeOptions = toOptions(PUBLICATION_TYPE_LABEL);
  readonly visibilityOptions = toOptions(PUBLICATION_VISIBILITY_LABEL);
  readonly maxYear = new Date().getFullYear() + 1;

  private readonly currentType = signal<PublicationType>('journal_article');
  readonly typeFields = computed<TypeField[]>(() => TYPE_FIELDS[this.currentType()]);

  form!: FormGroup;

  get isEdit(): boolean {
    return !!this.publication;
  }

  get authors(): FormArray<FormGroup> {
    return this.form.get('authors') as FormArray<FormGroup>;
  }

  get extra(): FormGroup {
    return this.form.get('extra') as FormGroup;
  }

  ngOnInit(): void {
    const p = this.publication;
    this.liveAuthors.set(p?.authors ?? []);
    this.currentType.set(p?.type ?? 'journal_article');
    this.tab.set(this.startTab);

    this.form = this.fb.nonNullable.group({
      type: [{ value: p?.type ?? 'journal_article', disabled: !!p }],
      title: [p?.title ?? '', [Validators.required, Validators.maxLength(500)]],
      abstract: [p?.abstract ?? '', Validators.maxLength(10000)],
      year: [
        p?.year ?? new Date().getFullYear(),
        [Validators.required, Validators.min(1800), Validators.max(this.maxYear)],
      ],
      authors: this.fb.array<FormGroup>(
        (p?.authors?.length ? p.authors : [this.selfAuthor()]).map((a) =>
          this.authorGroup(a),
        ),
        Validators.required,
      ),
      keywords: [[...(p?.keywords ?? [])]],
      fields: [[...(p?.fields ?? [])]],
      language: [p?.language ?? '', Validators.pattern(/^[a-zA-Z]{2}$/)],
      doi: [p?.identifiers?.doi ?? ''],
      openalexId: [p?.identifiers?.openalexId ?? ''],
      url: [p?.url ?? ''],
      license: [p?.license ?? ''],
      visibility: [(p?.visibility ?? 'public') as PublicationVisibility],
      extra: this.buildExtra(p?.type ?? 'journal_article', p),
    });

    this.form.get('type')!.valueChanges.subscribe((type: PublicationType) => {
      this.currentType.set(type);
      this.form.setControl('extra', this.buildExtra(type, null));
    });
  }

  // ---------------- authors ----------------

  addAuthor(): void {
    this.authors.push(this.authorGroup({ name: '' }));
  }

  /** Create mode: a picked member becomes a linked row (the name comes from their account). */
  addMemberRow(u: UserSearchResult): void {
    if (this.authors.controls.some((c) => c.get('user')!.value === u._id)) return;
    const row = this.authorGroup({ user: u._id, name: memberName(u) });
    // reuse a blank trailing row instead of leaving an empty one behind
    const last = this.authors.at(this.authors.length - 1);
    if (last && !last.get('user')!.value && !last.get('name')!.value.trim()) {
      this.authors.setControl(this.authors.length - 1, row);
    } else {
      this.authors.push(row);
    }
  }

  isLinked(index: number): boolean {
    return !!this.authors.at(index).get('user')!.value;
  }

  // Edit mode: the API ignores `authors` on PATCH, so the list is changed through its own endpoints.

  readonly liveAuthors = signal<PublicationAuthor[]>([]);
  readonly authorBusy = signal(false);
  readonly externalName = new FormControl('', { nonNullable: true });

  addMember(u: UserSearchResult): void {
    this.runAuthorCall(this.service.addAuthor(this.publication!._id, { user: u._id }));
  }

  addExternal(): void {
    const name = this.externalName.value.trim();
    if (!name) return;
    this.runAuthorCall(this.service.addAuthor(this.publication!._id, { name }), () =>
      this.externalName.reset(),
    );
  }

  removeLive(a: PublicationAuthor): void {
    this.runAuthorCall(this.service.removeAuthor(this.publication!._id, a._id!));
  }

  private runAuthorCall(call: Observable<{ authors: PublicationAuthor[] }>, done?: () => void): void {
    this.authorBusy.set(true);
    this.error.set(null);
    call.subscribe({
      next: (r) => {
        this.liveAuthors.set(r.authors);
        done?.();
        this.authorBusy.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Could not update the authors.');
        this.authorBusy.set(false);
      },
    });
  }

  removeAuthor(index: number): void {
    if (this.authors.length > 1) this.authors.removeAt(index);
  }

  private selfAuthor() {
    const me = this.auth.currentUser();
    return {
      user: me?.id ?? null,
      name: me ? `${me.firstName} ${me.lastName}`.trim() : '',
      isCorresponding: false,
    };
  }

  private authorGroup(a: {
    user?: string | null;
    name: string;
    affiliation?: string;
    orcid?: string;
    isCorresponding?: boolean;
  }): FormGroup {
    return this.fb.nonNullable.group({
      // the link to a scholarNet user is kept as-is, only name/affiliation are editable
      user: [a.user ?? ''],
      name: [a.name, [Validators.required, Validators.maxLength(200)]],
      affiliation: [a.affiliation ?? '', Validators.maxLength(300)],
      orcid: [
        a.orcid ?? '',
        Validators.pattern(/^(\d{4}-\d{4}-\d{4}-\d{3}[\dX])?$/),
      ],
      isCorresponding: [a.isCorresponding ?? false],
    });
  }

  // ---------------- type-specific fields ----------------

  private buildExtra(type: PublicationType, source: Publication | null): FormGroup {
    const controls: Record<string, FormControl> = {};
    for (const f of TYPE_FIELDS[type]) {
      const raw = source?.[f.key];
      const initial =
        f.kind === 'boolean'
          ? !!raw
          : f.kind === 'date'
            ? toDate(raw)
            : raw == null
              ? ''
              : raw;
      controls[f.key] = new FormControl(initial, {
        validators: f.required ? [Validators.required] : [],
      });
    }
    return new FormGroup(controls);
  }

  // ---------------- submit ----------------

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);

    const payload = this.buildPayload();
    const request$ = this.publication
      ? this.service.update(this.publication._id, payload)
      : this.service.create(payload);

    const creating = !this.publication;
    request$.subscribe({
      next: async (pub) => {
        if (creating) {
          const failures = await this.sendQueuedReferences(pub._id);
          if (failures.length) {
            // the publication exists now: stay open as an edit dialog so Create can't duplicate it
            this.publication = pub;
            this.form.get('type')?.disable();
            this.drafts.set([]);
            this.pendingImports.set([]);
            this.fileQueue.set([]);
            this.submitting.set(false);
            this.tab.set('references');
            this.error.set(
              `Publication created, but ${failures.length} reference step(s) failed: ${failures.join(' ')} ` +
                'Add them again from this tab.',
            );
            this.changed.emit(pub);
            return;
          }
        }
        this.submitting.set(false);
        this.saved.emit(pub);
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err?.error?.message;
        this.error.set(
          Array.isArray(msg) ? msg.join(' ') : (msg ?? 'Something went wrong'),
        );
      },
    });
  }

  /** Sends the queued references and files one by one; returns a message per failure. */
  private async sendQueuedReferences(publicationId: string): Promise<string[]> {
    const failures: string[] = [];
    const msg = (err: any) =>
      [].concat(err?.error?.message ?? 'Request failed.').join(' ');

    for (const d of this.drafts()) {
      try {
        await firstValueFrom(this.referencesApi.add(publicationId, d.input));
      } catch (err) {
        failures.push(`"${d.label ?? d.input.title ?? d.input.doi ?? 'reference'}": ${msg(err)}`);
      }
    }
    for (const imp of this.pendingImports()) {
      try {
        await firstValueFrom(this.referencesApi.importReferences(publicationId, imp));
      } catch (err) {
        failures.push(`${imp.format} import: ${msg(err)}`);
      }
    }
    for (const q of this.fileQueue()) {
      try {
        await new Promise<void>((resolve, reject) =>
          this.filesApi.upload(publicationId, q.file, q.options).subscribe({ error: reject, complete: resolve }),
        );
      } catch (err) {
        failures.push(`file "${q.file.name}": ${msg(err)}`);
      }
    }
    return failures;
  }

  /**
   * On create, empty optional values are left out. On edit they become null so the
   * API clears them (its validators skip null, and PATCH uses $set).
   */
  private buildPayload(): Record<string, unknown> {
    const v = this.form.getRawValue();
    const empty = this.isEdit ? null : undefined;
    const text = (s: string) => (s?.toString().trim() ? s.toString().trim() : empty);

    const payload: Record<string, unknown> = {
      title: v.title.trim(),
      abstract: text(v.abstract),
      year: Number(v.year),
      ...(!this.isEdit && {
        authors: v.authors.map((a: any, i: number) => ({
          ...(a.user && { user: a.user }),
          name: a.name.trim(),
          ...(a.affiliation?.trim() && { affiliation: a.affiliation.trim() }),
          ...(a.orcid?.trim() && { orcid: a.orcid.trim() }),
          isCorresponding: !!a.isCorresponding,
          order: i,
        })),
      }),
      keywords: v.keywords,
      fields: v.fields,
      language: text(v.language),
      url: text(v.url),
      license: text(v.license),
      visibility: v.visibility,
      // PATCH replaces the whole object, so keep identifiers this form doesn't edit (isbn, issn...)
      identifiers: {
        ...this.publication?.identifiers,
        doi: v.doi?.trim() || '',
        openalexId: v.openalexId?.trim() || '',
      },
    };
    if (!this.isEdit) payload['type'] = v.type;

    for (const f of this.typeFields()) {
      const raw = v.extra[f.key];
      payload[f.key] =
        f.kind === 'boolean'
          ? !!raw
          : f.kind === 'date'
            ? (fromDate(raw) ?? empty)
            : f.kind === 'number'
            ? raw === '' || raw == null
              ? empty
              : Number(raw)
            : text(raw);
    }

    // undefined keys would be dropped by JSON anyway; strip them explicitly
    return Object.fromEntries(
      Object.entries(payload).filter(([, val]) => val !== undefined),
    );
  }
}
