import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavDrawerService } from '../../../../core/services/nav-drawer.service';

interface NavItem {
  label: string;
  icon: string;
  link: string;
}

/** The app's section menu. Used as a fixed column on wide screens and inside a drawer on phones. */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private readonly drawer = inject(NavDrawerService);

  readonly items: NavItem[] = [
    { label: 'Publications', icon: 'pi pi-book', link: '/main/publications' },
    { label: 'Teams', icon: 'pi pi-users', link: '/main/teams' },
    { label: 'Thesis', icon: 'pi pi-graduation-cap', link: '/main/supervision' },
    { label: 'Circles', icon: 'pi pi-pencil', link: '/main/circles' },
    { label: 'Grants', icon: 'pi pi-compass', link: '/main/grants' },
    { label: 'Proposals', icon: 'pi pi-file-edit', link: '/main/proposals' },
    { label: 'Snippets', icon: 'pi pi-clone', link: '/main/snippets' },
  ];

  /** After choosing a section on a phone, get the drawer out of the way. */
  onNavigate(): void {
    this.drawer.onNavigate();
  }
}
