import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';

import {
  AppNotification,
  NOTIFICATION_TYPE_META,
  NotificationType,
} from '../../core/models/notification.model';
import { NotificationsService } from '../../core/services/notifications.service';
import { NotificationItemComponent } from './components/notification-item/notification-item.component';

type StatusFilter = 'all' | 'unread';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    PaginatorModule,
    SelectButtonModule,
    SkeletonModule,
    ToastModule,
    NotificationItemComponent,
  ],
  providers: [MessageService],
  templateUrl: './notifications.component.html',
})
export class NotificationsComponent implements OnInit {
  private readonly notificationsService = inject(NotificationsService);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);

  readonly pageSize = 15;
  readonly items = signal<AppNotification[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);

  status: StatusFilter = 'all';
  topic: NotificationType | 'ALL' = 'ALL';

  readonly statusOptions = [
    { label: 'All', value: 'all' },
    { label: 'Unread', value: 'unread' },
  ];

  /** "All" plus one option per notification topic */
  readonly topicOptions = [
    { label: 'All topics', value: 'ALL' },
    ...(
      Object.entries(NOTIFICATION_TYPE_META) as [
        NotificationType,
        { label: string },
      ][]
    ).map(([value, meta]) => ({ label: meta.label, value })),
  ];

  ngOnInit(): void {
    this.load();
    this.notificationsService.refreshUnreadCount();
  }

  load(page = 1): void {
    this.loading.set(true);
    this.notificationsService
      .list({
        page,
        limit: this.pageSize,
        unreadOnly: this.status === 'unread',
        type: this.topic === 'ALL' ? null : this.topic,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.data);
          this.total.set(res.total);
          this.page.set(res.page);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.messages.add({
            severity: 'error',
            summary: 'Could not load notifications',
          });
        },
      });
  }

  onFilterChange(): void {
    this.load(1);
  }

  onPageChange(event: PaginatorState): void {
    this.load((event.page ?? 0) + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  open(n: AppNotification): void {
    if (!n.isRead) {
      this.notificationsService.markRead(n._id).subscribe();
      this.items.update((list) =>
        list.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)),
      );
    }
    const target = this.notificationsService.routeFor(n);
    if (target) this.router.navigate(target);
  }

  remove(n: AppNotification): void {
    this.notificationsService.remove(n._id).subscribe({
      next: () => this.load(this.items().length === 1 && this.page() > 1 ? this.page() - 1 : this.page()),
    });
  }

  markAllRead(): void {
    this.notificationsService.markAllRead().subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'All marked as read' });
        this.load(this.page());
      },
    });
  }

  clearRead(): void {
    this.notificationsService.clear(true).subscribe({
      next: (res) => {
        this.messages.add({
          severity: 'success',
          summary: 'Cleared',
          detail: `${res.deleted} read notification(s) removed.`,
        });
        this.load(1);
      },
    });
  }
}
