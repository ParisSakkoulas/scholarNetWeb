import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { deadlineText, deadlineTone } from '../../models/grant.model';
import { MyReview, PROPOSAL_STATUS_META, Proposal, ProposalHistory } from '../../models/proposal.model';
import { ProposalsService } from '../../services/proposals.service';

/** My proposals (personal and teams'), the reviews waiting for me, and my track record. */
@Component({
  selector: 'app-proposal-list',
  standalone: true,
  imports: [DatePipe, RouterLink, ButtonModule, ProgressBarModule, SkeletonModule, TagModule],
  templateUrl: './proposal-list.component.html',
})
export class ProposalListComponent implements OnInit {
  private readonly service = inject(ProposalsService);

  readonly items = signal<Proposal[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly reviews = signal<MyReview[]>([]);
  readonly history = signal<ProposalHistory | null>(null);

  readonly statusMeta = PROPOSAL_STATUS_META;
  readonly deadlineText = deadlineText;
  readonly deadlineTone = deadlineTone;

  ngOnInit(): void {
    this.load();
    // these two are extras: if either fails, the list still works
    this.service.myReviews().subscribe({ next: (r) => this.reviews.set(r), error: () => this.reviews.set([]) });
    this.service.history().subscribe({ next: (h) => this.history.set(h), error: () => this.history.set(null) });
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.service.list().subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  percent(p: Proposal): number {
    const total = p.progress?.total ?? 0;
    return total ? Math.round(((p.progress?.done ?? 0) / total) * 100) : 0;
  }

  personName(p?: { firstName?: string; lastName?: string; username?: string }): string {
    return `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim() || p?.username || 'Someone';
  }
}
