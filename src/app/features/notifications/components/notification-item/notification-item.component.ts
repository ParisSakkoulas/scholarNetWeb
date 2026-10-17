import { Component, computed, input, output } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';

import {
  AppNotification,
  NOTIFICATION_TYPE_META,
} from '../../../../core/models/notification.model';

/** One notification row — used in the bell menu and on the full page. */
@Component({
  selector: 'sn-notification-item',
  standalone: true,
  imports: [AvatarModule, ButtonModule],
  templateUrl: './notification-item.component.html',
})
export class NotificationItemComponent {
  readonly notification = input.required<AppNotification>();
  /** show the delete (x) button */
  readonly removable = input(false);

  readonly opened = output<AppNotification>();
  readonly removed = output<AppNotification>();

  readonly meta = computed(() => NOTIFICATION_TYPE_META[this.notification().type]);

  readonly actorInitials = computed(() => {
    const actor = this.notification().actor;
    if (!actor) return '';
    return `${actor.firstName?.[0] ?? ''}${actor.lastName?.[0] ?? ''}`.toUpperCase();
  });

  readonly timeAgo = computed(() => {
    const seconds = Math.max(
      0,
      (Date.now() - new Date(this.notification().createdAt).getTime()) / 1000,
    );
    const units: [number, string][] = [
      [60 * 60 * 24 * 7, 'w'],
      [60 * 60 * 24, 'd'],
      [60 * 60, 'h'],
      [60, 'm'],
    ];
    for (const [size, label] of units) {
      if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`;
    }
    return 'Just now';
  });
}
