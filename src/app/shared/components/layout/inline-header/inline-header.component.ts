import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { ClickOutsideDirective } from '../../../directives/click-outside.directive';

import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { MenuModule } from 'primeng/menu';
import { Popover } from 'primeng/popover';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-inline-header',
  imports: [
    CommonModule,
    RouterLink,
    ClickOutsideDirective,
    InputTextModule,
    IconFieldModule,
    ButtonModule,
    InputIconModule,
    OverlayPanelModule,
    AvatarModule,
    AvatarGroupModule,
    MenuModule,
    Popover,
  ],
  templateUrl: './inline-header.component.html',
  styleUrl: './inline-header.component.css',
})
export class InlineHeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

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
    this.router.navigate(['/search'], { queryParams: { q: trimmed } });
  }

  goToOwnProfile(): void {
    const id = this.currentUser()?.id;
    if (id) this.router.navigate(['/main/profile', id]);
  }
}
