import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { catchError, debounceTime, of } from 'rxjs';

import {
  PUBLICATION_TYPE_LABEL,
  Publication,
  PublicationType,
} from '../../../../core/models/publication.model';
import { PublicationsService } from '../../../../core/services/publications.service';
import { PublicationFormComponent } from '../../../publications/publication-form/publication-form.component';
import { venueLabel } from '../../cv/citation';

const FIRST_PAGE = 5;
const MORE = 10;

/**
 * A person's publications on their profile. The API only returns what the viewer may see
 * (public, followers-only if they follow the owner, everything for the owner).
 */
@Component({
  selector: 'sn-profile-publications',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    PublicationFormComponent,
  ],
  templateUrl: './profile-publications.component.html',
})
export class ProfilePublicationsComponent {
  private readonly service = inject(PublicationsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly userId = input.required<string>();
  /** the profile belongs to the signed-in user: show "Add publication" */
  readonly isOwn = input(false);

  readonly typeLabel = PUBLICATION_TYPE_LABEL;
  readonly typeOptions = Object.entries(PUBLICATION_TYPE_LABEL).map(([value, label]) => ({ value, label }));
  readonly venueLabel = venueLabel;

  readonly search = new FormControl('', { nonNullable: true });
  readonly type = new FormControl<PublicationType | null>(null);

  readonly items = signal<Publication[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly showForm = signal(false);

  /** true when a search or filter is active (changes the empty message) */
  readonly filtered = computed(() => !!this.search.value.trim() || !!this.type.value);
  readonly FIRST_PAGE_HINT = FIRST_PAGE;
  /** guards against a slow response for a previous profile or filter overwriting newer data */
  private requestId = 0;

  constructor() {
    // a different profile (the component is reused when only the route param changes)
    effect(() => {
      this.userId();
      untracked(() => this.reload());
    });

    this.search.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reload());
    this.type.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reload());
  }

  reload(): void {
    this.fetch(false);
  }

  showMore(): void {
    this.fetch(true);
  }

  private fetch(append: boolean): void {
    const id = ++this.requestId;
    const offset = append ? this.items().length : 0;
    // the API pages by number, so request whole pages that cover the items already shown
    const limit = append ? MORE : FIRST_PAGE;
    const page = append ? Math.floor(offset / limit) + 1 : 1;

    this.loading.set(true);
    this.error.set(false);
    this.service
      .byUser(this.userId(), {
        page,
        limit,
        q: this.search.value.trim() || undefined,
        type: this.type.value,
      })
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (id !== this.requestId) return;
        this.loading.set(false);
        if (!res) {
          this.error.set(true);
          return;
        }
        this.total.set(res.total);
        if (!append) {
          this.items.set(res.data);
          return;
        }
        // drop anything already shown (page boundaries differ from the first 5-item page)
        const seen = new Set(this.items().map((p) => p._id));
        this.items.update((list) => [...list, ...res.data.filter((p) => !seen.has(p._id))]);
      });
  }

  onSaved(): void {
    this.showForm.set(false);
    this.reload();
  }

  authors(p: Publication): string {
    const names = p.authors.map((a) => a.name);
    return names.length > 6 ? `${names.slice(0, 6).join(', ')}, et al.` : names.join(', ');
  }
}
