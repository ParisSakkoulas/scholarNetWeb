import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { FooterComponent } from "../../shared/components/layout/footer/footer.component";
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { InlineHeaderComponent } from '../../shared/components/layout/inline-header/inline-header.component';

@Component({
  selector: 'app-main-layout',
  imports: [InlineHeaderComponent, FooterComponent, CommonModule, RouterOutlet],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent {
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
