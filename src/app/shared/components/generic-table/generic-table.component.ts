import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MultiSelect } from 'primeng/multiselect';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap,
} from 'rxjs';

import {
  ResolvedTableConfig,
  RowAction,
  TableColumn,
} from '../../types/Collection-Blueprint/collection-blueprint.types';
import { PageQuery, Page } from '../../models/page-query';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';

const DEFAULT_CONFIG: ResolvedTableConfig = {
  pageSize: 10,
  pageSizeOptions: [10, 25, 50],
  emptyMessage: 'Nothing here yet.',
  columnChooser: false,
  search: false,
  searchPlaceholder: 'Search...',
};

@Component({
  selector: 'app-generic-table',
  imports: [
    TableModule,
    ButtonModule,
    MultiSelect,
    FormsModule,
    InputTextModule,
    InputIconModule,
    IconFieldModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './generic-table.component.html',
  styleUrl: './generic-table.component.css',
})
export class GenericTableComponent {
  readonly columns = input.required<TableColumn<any>[]>();
  readonly fetchPage =
    input.required<(query: PageQuery) => Observable<Page<any>>>();
  readonly actions = input<RowAction<any>[]>([]);
  readonly config = input<ResolvedTableConfig>(DEFAULT_CONFIG);
  /** Remembers the column choice in localStorage under this key (use the blueprint name). */
  readonly storageKey = input<string | undefined>();

  protected readonly rows = signal<any[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);

  protected readonly visibleFields = signal<string[]>([]);
  protected readonly visibleColumns = computed(() => {
    const visible = this.visibleFields();
    return this.columns().filter((c) => visible.includes(c.field));
  });

  private readonly queries$ = new Subject<PageQuery>();
  private readonly search$ = new Subject<string>();
  private lastQuery: PageQuery | null = null;

  protected readonly searchInput = signal('');
  protected readonly firstRecord = signal(0);

  constructor() {
    // switchMap drops stale responses when the user pages or sorts quickly
    this.queries$
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap((query) =>
          this.fetchPage()(query).pipe(
            catchError(() => {
              this.loading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.rows.set(result.data);
        this.total.set(result.total);
        this.loading.set(false);
      });

    // debounced so typing doesn't fire a request per keystroke
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => this.runSearch(term));

    // pick the starting column set: saved choice, else everything not marked hidden
    effect(() => {
      const columns = this.columns();
      untracked(() => this.visibleFields.set(this.initialFields(columns)));
    });
  }

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const rows = event.rows ?? this.config().pageSize;
    const sortField =
      typeof event.sortField === 'string' ? event.sortField : undefined;

    const query: PageQuery = {
      page: Math.floor((event.first ?? 0) / rows) + 1,
      pageSize: rows,
      sortField,
      sortOrder: sortField
        ? event.sortOrder === -1
          ? 'desc'
          : 'asc'
        : undefined,
    };

    this.firstRecord.set(
      query.page - 1 ? (query.page - 1) * query.pageSize : 0,
    );
    this.lastQuery = query;
    this.queries$.next(query);
  }

  /** Re-fetches the current page — call after an edit/delete changes a row. */
  reload(): void {
    if (this.lastQuery) this.queries$.next(this.lastQuery);
  }

  protected onSearchInput(value: string): void {
    this.searchInput.set(value);
    this.search$.next(value.trim());
  }

  /** A new search term always starts over at page 1, keeping the current sort. */
  private runSearch(term: string): void {
    const query: PageQuery = {
      page: 1,
      pageSize: this.config().pageSize,
      sortField: this.lastQuery?.sortField,
      sortOrder: this.lastQuery?.sortOrder,
      search: term || undefined,
    };

    this.firstRecord.set(0);
    this.lastQuery = query;
    this.queries$.next(query);
  }

  protected setVisibleFields(fields: string[]): void {
    // never let the table end up with zero columns
    const next = fields.length
      ? [...fields]
      : this.defaultFields(this.columns());
    this.visibleFields.set(next);

    const key = this.storageKey();
    if (key && this.config().columnChooser) {
      try {
        localStorage.setItem(this.storageId(key), JSON.stringify(next));
      } catch {
        // storage unavailable (private mode, quota): the choice just isn't remembered
      }
    }
  }

  protected cell(row: any, col: TableColumn<any>): string {
    const value = row[col.field];
    if (col.format) return col.format(value, row);
    return value ?? '';
  }

  private defaultFields(columns: TableColumn<any>[]): string[] {
    return columns.filter((c) => !c.hidden).map((c) => c.field);
  }

  private initialFields(columns: TableColumn<any>[]): string[] {
    const key = this.storageKey();
    if (key && this.config().columnChooser) {
      try {
        const saved = JSON.parse(
          localStorage.getItem(this.storageId(key)) ?? 'null',
        );
        if (Array.isArray(saved)) {
          const known = columns.map((c) => c.field as string);
          const valid = saved.filter((f: string) => known.includes(f));
          if (valid.length) return valid;
        }
      } catch {
        // ignore corrupt or unavailable storage and fall back to the defaults
      }
    }
    return this.defaultFields(columns);
  }

  private storageId(key: string): string {
    return `sn-table-columns:${key}`;
  }
}
