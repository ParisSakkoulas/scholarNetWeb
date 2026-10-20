import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RatingModule } from 'primeng/rating';

import { RatingSummary, RatingTarget } from '../../../../core/models/rating.model';
import { AuthService } from '../../../../core/services/auth.service';
import { RatingsService } from '../../../../core/services/ratings.service';

/**
 * Star rating for a publication or a profile. Loads the average + the viewer's own rating
 * and lets a signed-in viewer set or clear theirs. Owners (`canRate` false) and anonymous
 * visitors only see the average.
 */
@Component({
  selector: 'sn-rating',
  imports: [FormsModule, RatingModule],
  template: `
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      @if (interactive()) {
        <p-rating
          [ngModel]="summary().mine ?? 0"
          [disabled]="busy()"
          (onRate)="rate($event.value)"
          (onCancel)="clear()"
        />
      } @else {
        <p-rating [ngModel]="rounded()" [readonly]="true" />
      }
      <span class="text-sm text-gray-600">
        @if (summary().count) {
          <strong class="text-gray-900">{{ summary().average.toFixed(1) }}</strong>
          · {{ summary().count }} {{ summary().count === 1 ? 'rating' : 'ratings' }}
        } @else {
          No ratings yet
        }
      </span>
      @if (interactive() && summary().mine) {
        <span class="text-xs text-gray-500">Your rating: {{ summary().mine }}</span>
      }
      @if (error()) {
        <span class="text-xs text-red-600">{{ error() }}</span>
      }
    </div>
  `,
})
export class RatingComponent {
  private readonly api = inject(RatingsService);
  private readonly auth = inject(AuthService);

  readonly targetType = input.required<RatingTarget>();
  /** Publication id, or the profile owner's user id. */
  readonly targetId = input.required<string>();
  /** false for the owner of the thing being rated */
  readonly canRate = input(true);

  readonly summary = signal<RatingSummary>({ average: 0, count: 0, mine: null });
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly interactive = computed(() => this.canRate() && this.auth.isAuthenticated());
  readonly rounded = computed(() => Math.round(this.summary().average));

  constructor() {
    // reload whenever the page switches to another publication/profile
    effect(() => {
      const type = this.targetType();
      const id = this.targetId();
      this.error.set(null);
      this.api.get(type, id).subscribe({
        next: (s) => this.summary.set(s),
        error: () => this.summary.set({ average: 0, count: 0, mine: null }),
      });
    });
  }

  rate(value: number): void {
    this.send(this.api.rate(this.targetType(), this.targetId(), value));
  }

  clear(): void {
    this.send(this.api.remove(this.targetType(), this.targetId()));
  }

  private send(request: ReturnType<RatingsService['rate']>): void {
    this.busy.set(true);
    this.error.set(null);
    request.subscribe({
      next: (s) => {
        this.summary.set(s);
        this.busy.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Could not save your rating.');
        this.busy.set(false);
      },
    });
  }
}
