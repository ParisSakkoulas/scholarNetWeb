import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { AuthService } from '../../../../core/services/auth.service';
import { TeamMembersService } from '../../../teams/services/team-members.service';
import { DISCLAIMER, deadlineText, deadlineTone } from '../../models/grant.model';
import {
  PROPOSAL_STATUS_META,
  PROPOSAL_STATUS_OPTIONS,
  PersonRef,
  Proposal,
  ProposalComment,
  ProposalFile,
  ProposalSection,
  ReviewStatus,
  ReviewerCandidate,
  SECTION_STATUS_OPTIONS,
  SECTION_STATUS_SEVERITY,
  SectionReview,
  fileSizeText,
} from '../../models/proposal.model';
import { ProposalsService } from '../../services/proposals.service';
import { SnippetPickerComponent } from '../snippet-picker/snippet-picker.component';

const personName = (p: PersonRef | string | null | undefined): string => {
  if (!p) return '';
  if (typeof p === 'string') return p;
  return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || p.username || '';
};
const personId = (p: PersonRef | string | null | undefined): string | null => (!p ? null : typeof p === 'string' ? p : p._id);

const REVIEW_LABEL: Record<ReviewStatus, string> = {
  pending: 'Waiting',
  approved: 'Approved',
  changes_requested: 'Changes requested',
  cancelled: 'Cancelled',
};
const REVIEW_SEVERITY: Record<ReviewStatus, 'warn' | 'success' | 'danger' | 'secondary'> = {
  pending: 'warn',
  approved: 'success',
  changes_requested: 'danger',
  cancelled: 'secondary',
};
const FINAL_STATUSES = ['submitted', 'awarded', 'rejected'];

/** One proposal: deadlines, sections with owners, due dates, drafts, reviews and comments, and the outcome. */
@Component({
  selector: 'app-proposal-detail',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    DialogModule,
    InputTextModule,
    ProgressBarModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    TextareaModule,
    SnippetPickerComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './proposal-detail.component.html',
})
export class ProposalDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(ProposalsService);
  private readonly teamMembers = inject(TeamMembersService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly auth = inject(AuthService);

  proposalId!: string;
  readonly proposal = signal<Proposal | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly busy = signal<string | null>(null);
  /** people a section can be assigned to */
  readonly people = signal<{ label: string; value: string }[]>([]);

  readonly editingTitle = signal(false);
  titleDraft = '';
  newSection = '';
  outcomeDraft = '';

  // snippets
  readonly pickerSection = signal<ProposalSection | null>(null);

  // asking for a review
  readonly reviewTarget = signal<ProposalSection | null>(null);
  readonly candidates = signal<ReviewerCandidate[]>([]);
  readonly candidatesLoading = signal(false);
  reviewerId: string | null = null;
  reviewNote = '';

  // answering a review
  readonly answering = signal<{ section: ProposalSection; review: SectionReview } | null>(null);
  answerText = '';

  // comments, per section
  readonly threads = signal<Record<string, ProposalComment[]>>({});
  readonly openThreads = signal<string[]>([]);
  drafts: Record<string, string> = {};

  readonly statusOptions = PROPOSAL_STATUS_OPTIONS;
  readonly sectionStatusOptions = SECTION_STATUS_OPTIONS;
  readonly statusMeta = PROPOSAL_STATUS_META;
  readonly sectionSeverity = SECTION_STATUS_SEVERITY;
  readonly reviewLabel = REVIEW_LABEL;
  readonly reviewSeverity = REVIEW_SEVERITY;
  readonly disclaimer = DISCLAIMER;
  readonly deadlineText = deadlineText;
  readonly deadlineTone = deadlineTone;
  readonly personName = personName;
  readonly personId = personId;
  readonly fileSizeText = fileSizeText;

  readonly canManage = computed(() => !!this.proposal()?.access?.canManage);
  readonly canWrite = computed(() => !!this.proposal()?.access?.canWrite);
  readonly isReviewer = computed(() => !!this.proposal()?.access?.isReviewer);
  readonly myId = computed(() => this.auth.currentUser()?.id ?? null);
  readonly sections = computed<ProposalSection[]>(() => this.proposal()?.sections ?? []);
  readonly progress = computed(() => {
    const s = this.sections();
    return s.length ? Math.round((s.filter((x) => x.status === 'done').length / s.length) * 100) : 0;
  });
  readonly official = computed(() => new Date(this.proposal()?.callId.deadline ?? Date.now()));
  /** The outcome panel: once the proposal is submitted, awarded or not funded. */
  readonly showOutcome = computed(() => FINAL_STATUSES.includes(this.proposal()?.status ?? ''));

  ngOnInit(): void {
    this.proposalId = this.route.snapshot.paramMap.get('id')!;
    this.load(true);
  }

  /** `first` shows the skeleton; later reloads keep the page steady while it refreshes. */
  load(first = false): void {
    if (first) this.loading.set(true);
    this.loadError.set(null);
    this.service.get(this.proposalId).subscribe({
      next: (p) => {
        const firstLoad = !this.proposal();
        this.proposal.set(p);
        this.outcomeDraft = p.outcomeNote ?? '';
        this.loading.set(false);
        if (firstLoad && !p.access?.isReviewer) this.loadPeople(p);
      },
      error: (err) => {
        this.loadError.set(err?.status === 404 ? 'This proposal does not exist, or you cannot see it.' : (err?.error?.message ?? 'Could not load this proposal'));
        this.loading.set(false);
      },
    });
  }

  private loadPeople(p: Proposal): void {
    if (!p.teamId) {
      // a personal proposal: the only person is its owner
      const me = this.auth.currentUser();
      if (me) this.people.set([{ label: `${me.firstName} ${me.lastName}`.trim() || me.username, value: me.id }]);
      return;
    }
    this.teamMembers.list(p.teamId._id).subscribe({
      next: (members) =>
        this.people.set(
          members
            .filter((m) => m.status === 'active' && m.role !== 'viewer')
            .map((m) => ({ label: personName(m.userId as PersonRef), value: personId(m.userId as PersonRef)! })),
        ),
    });
  }

  private fail(summary: string, err: any): void {
    this.busy.set(null);
    const message = err?.error?.message;
    this.messages.add({ severity: 'error', summary, detail: Array.isArray(message) ? message.join('. ') : (message ?? 'Something went wrong') });
    this.load();
  }

  // ---------------- proposal ----------------

  saveTitle(): void {
    const title = this.titleDraft.trim();
    if (title.length < 3) return;
    this.service.update(this.proposalId, { title }).subscribe({
      next: () => {
        this.editingTitle.set(false);
        this.load();
      },
      error: (err) => this.fail('Could not rename', err),
    });
  }

  startEdit(): void {
    this.titleDraft = this.proposal()!.title;
    this.editingTitle.set(true);
  }

  setStatus(status: string): void {
    this.service.update(this.proposalId, { status }).subscribe({
      next: () => this.load(),
      error: (err) => this.fail('Could not change the status', err),
    });
  }

  saveOutcome(): void {
    const note = this.outcomeDraft.trim();
    this.service.update(this.proposalId, { outcomeNote: note || null }).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Outcome saved' });
        this.load();
      },
      error: (err) => this.fail('Could not save the outcome', err),
    });
  }

  setInternalDeadline(date: Date | null): void {
    this.service.update(this.proposalId, { internalDeadline: date ? date.toISOString() : null }).subscribe({
      next: () => this.load(),
      error: (err) => this.fail('Could not change the deadline', err),
    });
  }

  confirmDelete(): void {
    this.confirmation.confirm({
      header: 'Delete proposal',
      message: 'Delete this proposal, its sections, attached drafts, review requests and comments? The team project and board stay.',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () =>
        this.service.remove(this.proposalId).subscribe({
          next: () => this.router.navigate(['/main/proposals']),
          error: (err) => this.fail('Could not delete', err),
        }),
    });
  }

  // ---------------- sections ----------------

  toDate(value: string): Date {
    return new Date(value);
  }

  sectionLabel(status: string): string {
    return this.sectionStatusOptions.find((o) => o.value === status)?.label ?? status;
  }

  dueDateOf(s: ProposalSection): Date | null {
    return s.dueDate ? new Date(s.dueDate) : null;
  }

  changeSection(s: ProposalSection, patch: { status?: string; ownerId?: string | null; dueDate?: string | null }): void {
    this.busy.set(s._id);
    this.service.updateSection(this.proposalId, s._id, patch).subscribe({
      next: () => {
        this.busy.set(null);
        this.load();
      },
      error: (err) => this.fail('Could not update the section', err),
    });
  }

  onDueDate(s: ProposalSection, date: Date | null): void {
    this.changeSection(s, { dueDate: date ? date.toISOString() : null });
  }

  addSection(): void {
    const title = this.newSection.trim();
    if (title.length < 2) return;
    this.service.addSection(this.proposalId, { title }).subscribe({
      next: () => {
        this.newSection = '';
        this.load();
      },
      error: (err) => this.fail('Could not add the section', err),
    });
  }

  confirmRemoveSection(s: ProposalSection): void {
    this.confirmation.confirm({
      header: 'Remove section',
      message: `Remove "${s.title}", its files, review requests and comments?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Remove', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () =>
        this.service.removeSection(this.proposalId, s._id).subscribe({
          next: () => this.load(),
          error: (err) => this.fail('Could not remove the section', err),
        }),
    });
  }

  // ---------------- files ----------------

  onFilePicked(s: ProposalSection, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // so the same file can be picked again later
    if (!file) return;
    this.busy.set(s._id);
    this.service.upload(this.proposalId, s._id, file).subscribe({
      next: () => {
        this.busy.set(null);
        this.messages.add({ severity: 'success', summary: 'Draft attached', detail: file.name });
        this.load();
      },
      error: (err) => this.fail('Could not attach the file', err),
    });
  }

  download(f: ProposalFile): void {
    this.service.download(this.proposalId, f).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = f.fileName;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => this.fail('Could not download the file', err),
    });
  }

  removeFile(f: ProposalFile): void {
    this.service.removeFile(this.proposalId, f._id).subscribe({
      next: () => this.load(),
      error: (err) => this.fail('Could not remove the file', err),
    });
  }

  // ---------------- reviews ----------------

  /** Reviews that still matter: answered or waiting, not cancelled (the API already leaves those out). */
  reviewsOf(s: ProposalSection): SectionReview[] {
    return s.reviews ?? [];
  }

  /** The signed-in user's own pending review of this section, if any. */
  myPendingReview(s: ProposalSection): SectionReview | null {
    return this.reviewsOf(s).find((r) => r.status === 'pending' && personId(r.reviewerId) === this.myId()) ?? null;
  }

  openReviewRequest(s: ProposalSection): void {
    this.reviewTarget.set(s);
    this.reviewerId = null;
    this.reviewNote = '';
    this.candidatesLoading.set(true);
    this.service.reviewers(this.proposalId).subscribe({
      next: (list) => {
        this.candidates.set(list);
        this.candidatesLoading.set(false);
      },
      error: (err) => {
        this.candidatesLoading.set(false);
        this.fail('Could not load the people you can ask', err);
      },
    });
  }

  get candidateOptions(): { label: string; value: string }[] {
    return this.candidates().map((c) => ({ label: `${c.name} (${c.kind})`, value: c.userId }));
  }

  sendReviewRequest(): void {
    const section = this.reviewTarget();
    if (!section || !this.reviewerId) return;
    this.service
      .requestReview(this.proposalId, section._id, { reviewerId: this.reviewerId, ...(this.reviewNote.trim() ? { note: this.reviewNote.trim() } : {}) })
      .subscribe({
        next: () => {
          this.reviewTarget.set(null);
          this.messages.add({ severity: 'success', summary: 'Review requested', detail: 'They were notified.' });
          this.load();
        },
        error: (err) => this.fail('Could not ask for a review', err),
      });
  }

  cancelReview(r: SectionReview): void {
    this.service.cancelReview(this.proposalId, r._id).subscribe({
      next: () => this.load(),
      error: (err) => this.fail('Could not cancel the request', err),
    });
  }

  openAnswer(section: ProposalSection, review: SectionReview): void {
    this.answerText = '';
    this.answering.set({ section, review });
  }

  answer(decision: 'approve' | 'changes'): void {
    const target = this.answering();
    if (!target) return;
    this.service
      .respondReview(this.proposalId, target.review._id, { decision, ...(this.answerText.trim() ? { response: this.answerText.trim() } : {}) })
      .subscribe({
        next: () => {
          this.answering.set(null);
          this.messages.add({ severity: 'success', summary: decision === 'approve' ? 'Approved' : 'Changes requested', detail: 'The requester was told.' });
          this.load();
        },
        error: (err) => this.fail('Could not send your answer', err),
      });
  }

  // ---------------- comments ----------------

  isOpen(s: ProposalSection): boolean {
    return this.openThreads().includes(s._id);
  }

  toggleThread(s: ProposalSection): void {
    if (this.isOpen(s)) {
      this.openThreads.update((l) => l.filter((id) => id !== s._id));
      return;
    }
    this.openThreads.update((l) => [...l, s._id]);
    this.loadThread(s);
  }

  private loadThread(s: ProposalSection): void {
    this.service.comments(this.proposalId, s._id).subscribe({
      next: (list) => this.threads.update((t) => ({ ...t, [s._id]: list })),
      error: (err) => this.fail('Could not load the comments', err),
    });
  }

  threadOf(s: ProposalSection): ProposalComment[] {
    return this.threads()[s._id] ?? [];
  }

  /** Writers can comment, and so can a reviewer on the sections they were asked about. */
  get canComment(): boolean {
    return this.canWrite() || this.isReviewer();
  }

  postComment(s: ProposalSection): void {
    const body = (this.drafts[s._id] ?? '').trim();
    if (!body) return;
    this.service.addComment(this.proposalId, s._id, body).subscribe({
      next: () => {
        this.drafts[s._id] = '';
        this.loadThread(s);
      },
      error: (err) => this.fail('Could not post the comment', err),
    });
  }

  canDeleteComment(c: ProposalComment): boolean {
    return personId(c.authorId) === this.myId() || this.canManage();
  }

  deleteComment(s: ProposalSection, c: ProposalComment): void {
    this.service.removeComment(this.proposalId, c._id).subscribe({
      next: () => this.loadThread(s),
      error: (err) => this.fail('Could not delete the comment', err),
    });
  }
}
