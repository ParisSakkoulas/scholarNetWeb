import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { MessageService } from 'primeng/api';
import { Supervision, personName } from '../../models/supervision.model';
import { SupervisionService } from '../../services/supervision.service';

/** "My students": progress, next meeting and an overdue badge per student, plus pending invitations. */
@Component({
  selector: 'app-supervisor-dashboard',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    ButtonModule,
    ProgressBarModule,
    SkeletonModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './supervisor-dashboard.component.html',
})
export class SupervisorDashboardComponent implements OnInit {
  private readonly service = inject(SupervisionService);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  readonly rows = signal<Supervision[]>([]);
  readonly loading = signal(true);
  readonly busy = signal<string | null>(null);

  readonly invitations = computed(() => this.rows().filter((r) => r.status === 'pending'));
  /** students with overdue work first: those are who needs help */
  readonly students = computed(() =>
    this.rows()
      .filter((r) => r.status === 'active')
      .sort((a, b) => (b.stats?.overdueCount ?? 0) - (a.stats?.overdueCount ?? 0)),
  );

  readonly personName = personName;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.service.students().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  open(row: Supervision): void {
    this.router.navigate(['/main/supervision', row._id]);
  }

  respond(row: Supervision, accept: boolean): void {
    this.busy.set(row._id);
    this.service.respond(row._id, accept).subscribe({
      next: () => {
        this.busy.set(null);
        this.messages.add({ severity: 'success', summary: accept ? 'Invitation accepted' : 'Invitation declined' });
        this.load();
      },
      error: (err) => {
        this.busy.set(null);
        this.messages.add({ severity: 'error', summary: 'Could not answer the invitation', detail: err?.error?.message });
        this.load();
      },
    });
  }
}
