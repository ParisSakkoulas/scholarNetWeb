import { Component, Input } from '@angular/core';

import { AUTHOR_STATUS_LABEL, PublicationAuthor } from '../../../core/models/publication.model';

/** Shows "member" for scholarNet users and their answer; outside co-authors get no badge. */
@Component({
  selector: 'app-author-status-badge',
  template: `
    @if (author.user) {
      @let s = author.status ?? (author.confirmed ? 'confirmed' : 'pending');
      <span
        class="ml-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
        [class.bg-green-100]="s === 'confirmed'"
        [class.text-green-800]="s === 'confirmed'"
        [class.bg-amber-100]="s === 'pending'"
        [class.text-amber-800]="s === 'pending'"
        [class.bg-red-100]="s === 'declined'"
        [class.text-red-800]="s === 'declined'"
        >{{ labels[s] }}</span
      >
    }
  `,
})
export class AuthorStatusBadgeComponent {
  @Input({ required: true }) author!: PublicationAuthor;
  readonly labels = AUTHOR_STATUS_LABEL;
}
