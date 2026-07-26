import { Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  mobileMenuOpen = signal(false);

  toggleMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  @HostListener('document:keydown.escape')
  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
