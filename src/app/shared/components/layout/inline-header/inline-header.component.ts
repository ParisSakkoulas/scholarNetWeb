import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { AppNotification } from '../../../../core/models/notification.model';
import { ChatService } from '../../../../core/services/chat.service';
import { NavDrawerService } from '../../../../core/services/nav-drawer.service';
import { NotificationsService } from '../../../../core/services/notifications.service';
import { NotificationItemComponent } from '../../../../features/notifications/components/notification-item/notification-item.component';
import { ClickOutsideDirective } from '../../../directives/click-outside.directive';

import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { MenuModule } from 'primeng/menu';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { Popover } from 'primeng/popover';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-inline-header',
  imports: [
    CommonModule,
    RouterLink,
    InputTextModule,
    IconFieldModule,
    ButtonModule,
    InputIconModule,
    OverlayPanelModule,
    AvatarModule,
    AvatarGroupModule,
    MenuModule,
    Popover,
    OverlayBadgeModule,
    NotificationItemComponent,
  ],
  templateUrl: './inline-header.component.html',
  styleUrl: './inline-header.component.css',
})
export class InlineHeaderComponent {
  readonly drawer = inject(NavDrawerService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationsService = inject(NotificationsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly unreadCount = this.notificationsService.unreadCount;
  readonly unreadLabel = computed(() =>
    this.unreadCount() > 99 ? '99+' : String(this.unreadCount()),
  );
  // injecting ChatService here opens the live chat connection once a user signs in
  private readonly chat = inject(ChatService);
  readonly messagesUnread = this.chat.unreadTotal;
  readonly messagesUnreadLabel = computed(() =>
    this.messagesUnread() > 99 ? '99+' : String(this.messagesUnread()),
  );
  readonly recent = signal<AppNotification[]>([]);
  readonly recentLoading = signal(false);

  constructor() {
    // load the badge once a user is signed in, then keep it fresh
    effect(() => {
      if (this.authService.currentUser()) {
        this.notificationsService.refreshUnreadCount();
      } else {
        this.notificationsService.resetUnreadCount();
      }
    });

    interval(60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.authService.currentUser()) {
          this.notificationsService.refreshUnreadCount();
        }
      });
  }

  @ViewChild('searchInput')
  private readonly searchInputRef?: ElementRef<HTMLInputElement>;
  readonly currentUser = this.authService.currentUser;

  readonly profileMenuOpen = signal(false);
  readonly notificationMenuOpen = signal(false);

  profileItems: MenuItem[] = [
    {
      label: 'View profile',
      icon: 'pi pi-user',
      command: () => this.goToOwnProfile(),
    },
    { label: 'My teams', icon: 'pi pi-users', routerLink: '/main/teams' },
    { label: 'My circles', icon: 'pi pi-pencil', routerLink: '/main/circles/mine' },
    { label: 'Saved grants', icon: 'pi pi-bookmark', routerLink: '/main/grants' },
    { label: 'My students', icon: 'pi pi-graduation-cap', routerLink: '/main/supervision/students' },
    { label: 'Requests', icon: 'pi pi-inbox', routerLink: '/main/requests/files' },
    { label: 'Settings', icon: 'pi pi-cog', routerLink: '/settings' },
    { label: 'Activity', icon: 'pi pi-history', routerLink: '/settings' },
    { separator: true },
    { label: 'Log out', icon: 'pi pi-sign-out', command: () => this.logout() },
  ];

  readonly initials = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return '';
    const first = user.firstName?.[0] ?? user.username?.[0] ?? '';
    const last = user.lastName?.[0] ?? '';
    return `${first}${last}`.toUpperCase();
  });

  @HostListener('window:keydown', ['$event'])
  handleShortcut(event: KeyboardEvent): void {
    const isShortcut =
      (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    if (isShortcut) {
      event.preventDefault();
      this.searchInputRef?.nativeElement.focus();
    }
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen.update((v) => !v);
  }

  toggleNotifications() {
    this.notificationMenuOpen.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    if (!this.profileMenuOpen()) return;
    const target = event.target as Node;
  }

  @HostListener('document:keydown.escape')
  closeProfileMenu(): void {
    this.profileMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  handleNotificationClick(event: MouseEvent): void {
    if (!this.notificationMenuOpen()) return;
    const target = event.target as Node;
  }

  @HostListener('document:keydown.escape')
  closeNotificationMenu(): void {
    this.notificationMenuOpen.set(false);
  }

  logout(): void {
    this.profileMenuOpen.set(false);
    this.authService.logout();
  }

  onSearchSubmit(query: string): void {
    const trimmed = query.trim();
    if (!trimmed) return;
    this.router.navigate(['/main/search'], { queryParams: { q: trimmed } });
  }

  toggleNotificationsPanel(event: Event, panel: Popover): void {
    panel.toggle(event);
    this.loadRecent();
  }

  private loadRecent(): void {
    this.recentLoading.set(true);
    this.notificationsService.list({ limit: 8 }).subscribe({
      next: (res) => {
        this.recent.set(res.data);
        this.recentLoading.set(false);
      },
      error: () => this.recentLoading.set(false),
    });
  }

  openNotification(n: AppNotification, panel: Popover): void {
    if (!n.isRead) {
      this.notificationsService.markRead(n._id).subscribe();
      this.recent.update((list) =>
        list.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)),
      );
    }
    panel.hide();
    const target = this.notificationsService.routeFor(n);
    if (target) this.router.navigate(target);
  }

  markAllRead(): void {
    this.notificationsService.markAllRead().subscribe({
      next: () =>
        this.recent.update((list) => list.map((x) => ({ ...x, isRead: true }))),
    });
  }

  goToOwnProfile(): void {
    const id = this.currentUser()?.id;
    if (id) this.router.navigate(['/main/profile', id]);
  }
}
