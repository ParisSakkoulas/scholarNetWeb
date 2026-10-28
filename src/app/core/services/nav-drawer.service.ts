import { Injectable, signal } from '@angular/core';

const KEY = 'sidebar-open';
const DESKTOP_QUERY = '(min-width: 1024px)';

/** Open state of the side menu, shared by the header button and the layout. */
@Injectable({ providedIn: 'root' })
export class NavDrawerService {
  /** Wide screens: the menu sits beside the page. Phones: it floats over it. */
  readonly isDesktop = signal(this.matches());
  readonly open = signal(this.initialOpen());

  constructor() {
    try {
      const query = window.matchMedia(DESKTOP_QUERY);
      query.addEventListener('change', (e) => {
        this.isDesktop.set(e.matches);
        // phones start with the menu closed; wide screens go back to what the user chose last
        this.open.set(e.matches ? this.remembered() : false);
      });
    } catch {
      /* no matchMedia (tests, old browsers): keep the initial values */
    }
  }

  toggle(): void {
    this.set(!this.open());
  }

  close(): void {
    this.set(false);
  }

  set(value: boolean): void {
    this.open.set(value);
    // only the wide-screen choice is remembered; the phone drawer always starts closed
    if (this.isDesktop()) {
      try {
        localStorage.setItem(KEY, String(value));
      } catch {
        /* private window or blocked storage: it just will not be remembered */
      }
    }
  }

  /** After picking a section: phones close the drawer, wide screens leave it as it is. */
  onNavigate(): void {
    if (!this.isDesktop()) this.open.set(false);
  }

  private matches(): boolean {
    try {
      return window.matchMedia(DESKTOP_QUERY).matches;
    } catch {
      return true;
    }
  }

  private remembered(): boolean {
    try {
      return localStorage.getItem(KEY) !== 'false';
    } catch {
      return true;
    }
  }

  private initialOpen(): boolean {
    return this.matches() ? this.remembered() : false;
  }
}
