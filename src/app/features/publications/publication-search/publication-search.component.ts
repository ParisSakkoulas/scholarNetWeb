import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { catchError, debounceTime, map, of, switchMap, tap } from 'rxjs';

import {
  PUBLICATION_TYPE_LABEL,
  Publication,
  PublicationType,
} from '../../../core/models/publication.model';
import { PublicationsService } from '../../../core/services/publications.service';

/** Filters kept in the URL, so a search can be shared, bookmarked and survives refresh. */
const FILTER_KEYS = ['type', 'yearFrom', 'yearTo', 'field', 'keyword'] as const;

@Component({
  selector: 'app-publication-search',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    PaginatorModule,
  ],
  templateUrl: './publication-search.component.html',
})
export class PublicationSearchComponent {
  private readonly service = inject(PublicationsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly typeLabel = PUBLICATION_TYPE_LABEL;
  readonly typeOptions = Object.entries(PUBLICATION_TYPE_LABEL).map(
    ([value, label]) => ({ value, label }),
  );

  readonly form = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    type: new FormControl<PublicationType | null>(null),
    yearFrom: new FormControl<number | null>(null),
    yearTo: new FormControl<number | null>(null),
    field: new FormControl('', { nonNullable: true }),
    keyword: new FormControl('', { nonNullable: true }),
  });

  readonly pageSize = 10;
  readonly results = signal<Publication[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal(false);
  /** false until the first request finishes, so the empty state doesn't flash */
  readonly searched = signal(false);
  readonly filtersOpen = signal(false);

  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  /** how many of the optional filters are active */
  readonly activeFilters = computed(
    () => FILTER_KEYS.filter((k) => this.params().get(k)).length,
  );

  constructor() {
    // URL -> form (initial load, back/forward, "clear filters")
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((p) => {
        this.form.patchValue(
          {
            q: p.get('q') ?? '',
            type: (p.get('type') as PublicationType) || null,
            yearFrom: Number(p.get('yearFrom')) || null,
            yearTo: Number(p.get('yearTo')) || null,
            field: p.get('field') ?? '',
            keyword: p.get('keyword') ?? '',
          },
          { emitEvent: false },
        );
        this.page.set(Math.max(1, Number(p.get('page')) || 1));
      });
    if (this.activeFilters() > 0) this.filtersOpen.set(true);

    // form -> URL (debounced so typing doesn't fire a request per key); a change restarts at page 1
    this.form.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.navigate(v, 1));

    // URL -> results; switchMap drops stale responses
    this.route.queryParamMap
      .pipe(
        map((p) => ({
          page: Math.max(1, Number(p.get('page')) || 1),
          q: p.get('q')?.trim() || undefined,
          type: (p.get('type') as PublicationType) || null,
          yearFrom: Number(p.get('yearFrom')) || null,
          yearTo: Number(p.get('yearTo')) || null,
          field: p.get('field')?.trim() || undefined,
          keyword: p.get('keyword')?.trim() || undefined,
        })),
        tap(() => {
          this.loading.set(true);
          this.error.set(false);
        }),
        switchMap((f) =>
          this.service
            .search({ ...f, limit: this.pageSize })
            .pipe(
              catchError(() => {
                this.error.set(true);
                return of(null);
              }),
            ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res) {
          this.results.set(res.data);
          this.total.set(res.total);
        }
        this.loading.set(false);
        this.searched.set(true);
      });
  }

  onPageChange(event: PaginatorState): void {
    this.navigate(this.form.getRawValue(), (event.page ?? 0) + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  clearFilters(): void {
    this.form.patchValue(
      { type: null, yearFrom: null, yearTo: null, field: '', keyword: '' },
      { emitEvent: false },
    );
    this.navigate(this.form.getRawValue(), 1);
  }

  authors(p: Publication): string {
    return p.authors.map((a) => a.name).join(', ');
  }

  private navigate(v: Partial<ReturnType<typeof this.form.getRawValue>>, page: number): void {
    this.router.navigate([], {
      queryParams: {
        q: v.q?.trim() || null,
        type: v.type || null,
        yearFrom: v.yearFrom || null,
        yearTo: v.yearTo || null,
        field: v.field?.trim() || null,
        keyword: v.keyword?.trim() || null,
        page: page > 1 ? page : null,
      },
      replaceUrl: true,
    });
  }
}
