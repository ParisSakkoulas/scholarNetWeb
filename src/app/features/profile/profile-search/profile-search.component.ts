import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TagModule } from 'primeng/tag';

import {
  ProfileSearchResult,
} from '../../../core/models/profile.model';
import { ProfileService } from '../../../core/services/profile.service';

@Component({
  selector: 'app-profile-search',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    ButtonModule,
    TagModule,
    PaginatorModule,
  ],
  templateUrl: './profile-search.component.html',
  styleUrl: './profile-search.component.css',
})
export class ProfileSearchComponent {
  private readonly profileService = inject(ProfileService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly query = new FormControl(
    this.route.snapshot.queryParamMap.get('q') ?? '',
    { nonNullable: true },
  );

  readonly results = signal<ProfileSearchResult[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  /** the term the current results belong to ('' = nothing searched yet) */
  readonly searched = signal('');

  readonly pageSize = 10;
  readonly total = signal(0);
  /** 1-based page currently shown */
  readonly page = signal(
    Math.max(1, Number(this.route.snapshot.queryParamMap.get('page')) || 1),
  );

  private readonly request$ = new Subject<{ term: string; page: number }>();

  constructor() {
    // the header search box navigates here with ?q=, so follow the URL too
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const q = params.get('q') ?? '';
        if (q !== this.query.value) this.query.setValue(q);
      });

    // a new term always starts again from page 1
    this.query.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((q) => this.request$.next({ term: q.trim(), page: 1 }));

    this.request$
      .pipe(
        tap(({ term, page }) => {
          this.page.set(page);
          this.error.set(false);
          this.router.navigate([], {
            queryParams: { q: term || null, page: term && page > 1 ? page : null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }),
        switchMap(({ term, page }) => {
          if (!term) {
            this.results.set([]);
            this.total.set(0);
            this.searched.set('');
            this.loading.set(false);
            return of(null);
          }
          this.loading.set(true);
          return this.profileService
            .searchProfiles(term, page, this.pageSize)
            .pipe(
              tap((res) => {
                this.results.set(res.items);
                this.total.set(res.total);
                this.searched.set(term);
                this.loading.set(false);
              }),
              catchError(() => {
                this.error.set(true);
                this.loading.set(false);
                return of(null);
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    // run the initial search when arriving with ?q= (and maybe ?page=)
    const initial = this.query.value.trim();
    if (initial) this.request$.next({ term: initial, page: this.page() });
  }

  onPageChange(event: PaginatorState): void {
    const page = (event.page ?? 0) + 1;
    this.request$.next({ term: this.searched(), page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  initials(result: ProfileSearchResult): string {
    const { firstName, lastName } = result.user;
    return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
  }

  location(result: ProfileSearchResult): string {
    return [result.city, result.country].filter(Boolean).join(', ');
  }

  /** a handful of interests/skills to preview on the card */
  topics(result: ProfileSearchResult): string[] {
    return [
      ...(result.skills ?? []).map((s) => s.name),
      ...(result.interests ?? []).map((i) => i.name),
    ].slice(0, 5);
  }
}
