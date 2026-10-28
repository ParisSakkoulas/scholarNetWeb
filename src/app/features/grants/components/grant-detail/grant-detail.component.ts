import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { AuthService } from '../../../../core/services/auth.service';
import {
  CAREER_STAGE_OPTIONS,
  DISCLAIMER,
  GrantCall,
  STATUS_META,
  amountText,
  countryOptions,
  deadlineText,
  deadlineTone,
  submitterName,
} from '../../models/grant.model';
import { GrantsService } from '../../services/grants.service';
import { GrantFormComponent } from '../grant-form/grant-form.component';
import { StartProposalComponent } from '../start-proposal/start-proposal.component';
import { Proposal } from '../../models/proposal.model';
import { ProposalsService } from '../../services/proposals.service';

/** One call: the summary, a prominent link to the official page, and the disclaimer. */
@Component({
  selector: 'app-grant-detail',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    SkeletonModule,
    TagModule,
    TextareaModule,
    GrantFormComponent,
    StartProposalComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './grant-detail.component.html',
})
export class GrantDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(GrantsService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly auth = inject(AuthService);
  private readonly proposalsService = inject(ProposalsService);

  grantId!: string;
  readonly grant = signal<GrantCall | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly editing = signal(false);
  readonly rejectOpen = signal(false);
  readonly startOpen = signal(false);
  /** proposals I (or my teams) already started for this call */
  readonly myProposals = signal<Proposal[]>([]);
  rejectNote = '';

  readonly isAdmin = computed(() => this.auth.currentUser()?.role === 'admin');
  readonly disclaimer = DISCLAIMER;
  readonly statusMeta = STATUS_META;
  readonly amountText = amountText;
  readonly deadlineText = deadlineText;
  readonly deadlineTone = deadlineTone;
  readonly submitterName = submitterName;

  private readonly countryNames = new Map(countryOptions().map((c) => [c.code, c.name]));
  private readonly stageNames = new Map(CAREER_STAGE_OPTIONS.map((s) => [s.value, s.label]));
  countryName = (code: string) => this.countryNames.get(code) ?? code;
  stageName = (v: string) => this.stageNames.get(v as never) ?? v;

  ngOnInit(): void {
    this.grantId = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.service.get(this.grantId).subscribe({
      next: (g) => {
        this.grant.set(g);
        this.loading.set(false);
        if (g.status === 'open' || g.status === 'closed') {
          this.proposalsService.list(g._id).subscribe({ next: (list) => this.myProposals.set(list), error: () => this.myProposals.set([]) });
        }
      },
      error: (err) => {
        this.loadError.set(err?.status === 404 ? 'This call does not exist, or it is not public.' : (err?.error?.message ?? 'Could not load this call'));
        this.loading.set(false);
      },
    });
  }

  private fail(summary: string, err: any): void {
    this.messages.add({ severity: 'error', summary, detail: err?.error?.message ?? 'Something went wrong' });
  }

  // ---------------- save / dismiss ----------------

  toggleSave(): void {
    const g = this.grant()!;
    const next = g.mySave === 'saved' ? null : 'saved';
    (next ? this.service.save(g._id) : this.service.unmark(g._id)).subscribe({
      next: () => this.grant.set({ ...g, mySave: next }),
      error: (err) => this.fail('Could not update', err),
    });
  }

  toggleDismiss(): void {
    const g = this.grant()!;
    const next = g.mySave === 'dismissed' ? null : 'dismissed';
    (next ? this.service.dismiss(g._id) : this.service.unmark(g._id)).subscribe({
      next: () => this.grant.set({ ...g, mySave: next }),
      error: (err) => this.fail('Could not update', err),
    });
  }

  onProposalStarted(proposal: Proposal): void {
    this.startOpen.set(false);
    this.messages.add({ severity: 'success', summary: 'Proposal started', detail: proposal.title });
    this.router.navigate(['/main/proposals', proposal._id]);
  }

  // ---------------- moderator ----------------

  approve(): void {
    this.service.review(this.grantId, 'approve').subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Call approved' });
        this.load();
      },
      error: (err) => this.fail('Could not approve', err),
    });
  }

  reject(): void {
    this.service.review(this.grantId, 'reject', this.rejectNote.trim() || undefined).subscribe({
      next: () => {
        this.rejectOpen.set(false);
        this.rejectNote = '';
        this.messages.add({ severity: 'info', summary: 'Call rejected' });
        this.load();
      },
      error: (err) => this.fail('Could not reject', err),
    });
  }

  onEdited(): void {
    this.editing.set(false);
    this.messages.add({ severity: 'success', summary: 'Call updated' });
    this.load();
  }

  confirmDelete(): void {
    this.confirmation.confirm({
      header: 'Delete call',
      message: 'Delete this call for everyone? Saved and dismissed marks are removed too.',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () =>
        this.service.remove(this.grantId).subscribe({
          next: () => this.router.navigate(['/main/grants']),
          error: (err) => this.fail('Could not delete', err),
        }),
    });
  }
}
