import { Component, HostListener, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, ButtonModule],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  readonly mobileMenuOpen = signal(false);

  /** sections of the home page (ids in public-home); the router scrolls to the fragment */
  readonly links = [
    { label: 'Features', fragment: 'features' },
    { label: 'How it works', fragment: 'how' },
  ];

  toggleMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  @HostListener('document:keydown.escape')
  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
