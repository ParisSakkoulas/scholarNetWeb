import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';

import {
  Supervision,
  SUPERVISION_STATUS_META,
  personName,
} from '../../models/supervision.model';
import { SupervisionService } from '../../services/supervision.service';
import { InviteSupervisorDialogComponent } from '../invite-dialog/invite-dialog.component';

/** Student home: my supervisions, with an entry point to invite a supervisor. */
@Component({
  selector: 'app-supervision-list',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    ButtonModule,
    ProgressBarModule,
    SkeletonModule,
    TagModule,
    InviteSupervisorDialogComponent,
  ],
  templateUrl: './supervision-list.component.html',
})
export class SupervisionListComponent implements OnInit {
  private readonly service = inject(SupervisionService);

  readonly items = signal<Supervision[]>([]);
  readonly loading = signal(true);
  readonly inviteOpen = signal(false);

  readonly statusMeta = SUPERVISION_STATUS_META;
  readonly personName = personName;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.mine().subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  supervisors(s: Supervision): string {
    const names = s.supervisorIds.map(personName).filter(Boolean);
    if (names.length) return names.join(', ');
    return s.inviteEmail ? `${s.inviteEmail} (not on ScholarNet yet)` : '';
  }
}
