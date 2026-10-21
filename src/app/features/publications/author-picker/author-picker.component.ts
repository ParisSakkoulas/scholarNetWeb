import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';

import { UserService } from '../../../core/services/user.service';
import { UserSearchResult } from '../../teams/models/user-search.model';

/** Search box that finds scholarNet members; emits the one the user picks, then clears itself. */
@Component({
  selector: 'app-author-picker',
  imports: [FormsModule, AutoCompleteModule],
  template: `
    <p-autocomplete
      [ngModel]="value()"
      (ngModelChange)="value.set($event)"
      [suggestions]="results()"
      (completeMethod)="search($event.query)"
      (onSelect)="pick($event.value)"
      optionLabel="username"
      placeholder="Find a scholarNet member"
      [minLength]="2"
      [delay]="300"
      ariaLabel="Find a scholarNet member"
      styleClass="w-full"
      inputStyleClass="w-full"
    >
      <ng-template let-u #item>
        <div class="flex flex-col">
          <span class="text-sm font-medium">{{ u.firstName }} {{ u.lastName }}</span>
          <span class="text-xs text-gray-500">&#64;{{ u.username }}</span>
        </div>
      </ng-template>
    </p-autocomplete>
  `,
})
export class AuthorPickerComponent {
  @Output() picked = new EventEmitter<UserSearchResult>();

  private readonly users = inject(UserService);

  readonly value = signal<UserSearchResult | string | null>(null);
  readonly results = signal<UserSearchResult[]>([]);

  search(query: string): void {
    this.users.search(query).subscribe({
      next: (r) => this.results.set(r),
      error: () => this.results.set([]),
    });
  }

  pick(user: UserSearchResult): void {
    this.picked.emit(user);
    this.value.set(null);
  }
}
