import { AfterViewInit, Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { FooterComponent } from "../../shared/components/layout/footer/footer.component";
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { InlineHeaderComponent } from '../../shared/components/layout/inline-header/inline-header.component';
import { SidebarComponent } from '../../shared/components/layout/sidebar/sidebar.component';
import { NavDrawerService } from '../../core/services/nav-drawer.service';
import { DrawerModule } from 'primeng/drawer';

@Component({
  selector: 'app-main-layout',
  imports: [InlineHeaderComponent, SidebarComponent, FooterComponent, CommonModule, RouterOutlet, DrawerModule],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent implements AfterViewInit {
  readonly drawer = inject(NavDrawerService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly top = viewChild.required<ElementRef<HTMLElement>>('top');
  /** Height of the sticky header, so the drawer can start right below it. */
  private readonly headerHeight = signal(57);

  readonly drawerStyle = computed(() => ({
    width: '14rem',
    top: `${this.headerHeight()}px`,
    height: `calc(100% - ${this.headerHeight()}px)`,
  }));

  ngAfterViewInit(): void {
    const el = this.top().nativeElement;
    this.headerHeight.set(el.offsetHeight || 57);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => this.headerHeight.set(el.offsetHeight || 57));
    observer.observe(el);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Full-height pages (the co-working editor) set `data: { hideFooter: true }` on their route. */
  readonly hideFooter = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let r = this.route.snapshot;
        while (r.firstChild) r = r.firstChild;
        return !!r.data['hideFooter'];
      }),
    ),
    { initialValue: false },
  );

}
