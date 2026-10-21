import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SkeletonModule } from 'primeng/skeleton';

import {
  PUBLICATION_TYPE_LABEL,
  Publication,
} from '../../core/models/publication.model';
import { PublicationsService } from '../../core/services/publications.service';
import { timeAgo } from '../../shared/utils/time-ago';
import { apiMessage } from '../publications/files/file-utils';

/** Publications where I was listed as an author and have not answered yet. */
@Component({
  selector: 'app-authorship-requests',
  imports: [RouterLink, AvatarModule, ButtonModule, PaginatorModule, SkeletonModule],
  template: `
    @if (error()) {
      <p class="mb-3 mt-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ error() }}</p>
    }

    @if (loading() && !items().length) {
      @for (i of [1, 2, 3]; track i) {
        <div class="mb-3 rounded-2xl border border-[var(--p-content-border-color)] bg-[var(--p-content-background)] p-4">
          <p-skeleton width="60%" height="1rem" styleClass="mb-2" />
          <p-skeleton width="35%" height="0.8rem" />
        </div>
      }
    } @else if (!items().length) {
      <div class="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--p-content-border-color)] px-4 py-14 text-center text-gray-500">
        <i class="pi pi-book text-4xl" aria-hidden="true"></i>
        <p class="m-0 font-medium text-gray-700">No authorship requests waiting for you</p>
      </div>
    } @else {
      <ul class="m-0 flex list-none flex-col gap-3 p-0" [class.opacity-60]="loading()">
        @for (p of items(); track p._id) {
          <li class="rounded-2xl border border-[var(--p-content-border-color)] bg-[var(--p-content-background)] p-4">
            <div class="flex items-start gap-3">
              <p-avatar
                [image]="p.uploadedBy.profilePhotoUrl"
                [label]="p.uploadedBy.profilePhotoUrl ? undefined : initials(p)"
                shape="circle"
              />
              <div class="min-w-0 flex-1">
                <div class="text-sm text-gray-900">
                  @if (p.uploadedBy; as u) {
                    <a [routerLink]="['/main/profile', u._id]" class="font-semibold hover:underline">{{ u.firstName }} {{ u.lastName }}</a>
                  }
                  listed you as an author of
                </div>
                <a [routerLink]="['/main/publications', p._id]" class="mt-0.5 block text-sm font-medium text-gray-900 hover:underline">{{ p.title }}</a>
                <div class="mt-1 text-xs text-gray-500">
                  {{ typeLabel[p.type] }} · {{ p.year }} · {{ timeAgo(p.createdAt) }}
                </div>
              </div>
              <div class="flex shrink-0 flex-col gap-2 sm:flex-row">
                <p-button label="Accept" icon="pi pi-check" size="small" [loading]="busyId() === p._id" (onClick)="answer(p, true)" />
                <p-button
                  label="Decline"
                  icon="pi pi-times"
                  size="small"
                  severity="secondary"
                  variant="outlined"
                  [loading]="busyId() === p._id"
                  (onClick)="answer(p, false)"
                />
              </div>
            </div>
          </li>
        }
      </ul>

      @if (total() > pageSize) {
        <p-paginator
          styleClass="mt-4"
          [rows]="pageSize"
          [totalRecords]="total()"
          [first]="(page() - 1) * pageSize"
          (onPageChange)="onPage($event)"
        />
      }
    }
  `,
})
export class AuthorshipRequestsComponent {
  private readonly api = inject(PublicationsService);

  readonly timeAgo = timeAgo;
  readonly typeLabel = PUBLICATION_TYPE_LABEL;
  readonly pageSize = 10;

  readonly items = signal<Publication[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);

  constructor() {
    this.load();
  }

  onPage(e: PaginatorState): void {
    this.page.set((e.page ?? 0) + 1);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.invitations(this.page(), this.pageSize).subscribe({
      next: (res) => {
        this.items.set(res.data);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiMessage(err, 'Could not load the requests.'));
        this.loading.set(false);
      },
    });
  }

  /** An answered invitation leaves the list; the page reloads when it empties a later page. */
  answer(p: Publication, accept: boolean): void {
    this.busyId.set(p._id);
    this.api.respondToAuthorship(p._id, accept).subscribe({
      next: () => {
        this.busyId.set(null);
        this.items.update((list) => list.filter((x) => x._id !== p._id));
        this.total.update((n) => Math.max(0, n - 1));
        if (!this.items().length && this.total() > 0) {
          this.page.update((n) => Math.max(1, n - 1));
          this.load();
        }
      },
      error: (err) => {
        this.busyId.set(null);
        this.error.set(apiMessage(err));
      },
    });
  }

  initials(p: Publication): string {
    const u = p.uploadedBy;
    return `${u?.firstName?.[0] ?? ''}${u?.lastName?.[0] ?? ''}`.toUpperCase();
  }
}
