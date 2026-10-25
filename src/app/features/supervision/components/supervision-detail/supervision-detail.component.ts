import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { Textarea } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';

import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import {
  ActionItem,
  ActionItemFile,
  Meeting,
  Milestone,
  MilestoneStatus,
  MILESTONE_STATUS_META,
  SUPERVISION_STATUS_META,
  SupervisionOverview,
  isOverdue,
  personName,
} from '../../models/supervision.model';
import type { SummaryData } from '../../editor/summary-export.util';
import { SupervisionService } from '../../services/supervision.service';
import { MAX_POST_LENGTH } from '../../../../core/models/post.model';
import { PostsService } from '../../../../core/services/posts.service';
import { DocumentsSectionComponent } from '../documents-section/documents-section.component';

const STUDENT_STATUSES: MilestoneStatus[] = ['todo', 'in_progress', 'submitted'];
const ALL_STATUSES: MilestoneStatus[] = [...STUDENT_STATUSES, 'needs_changes', 'approved'];

/** One supervision: milestone timeline, next meeting, open action items. Same page for both sides. */
@Component({
  selector: 'app-supervision-detail',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    MenuModule,
    ConfirmDialogModule,
    DatePickerModule,
    DialogModule,
    InputTextModule,
    ProgressBarModule,
    SelectModule,
    SkeletonModule,
    TabsModule,
    Textarea,
    TagModule,
    TimelineModule,
    DocumentsSectionComponent,
  ],
  templateUrl: './supervision-detail.component.html',
  providers: [ConfirmationService],
})
export class SupervisionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(SupervisionService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly posts = inject(PostsService);

  readonly id = this.route.snapshot.paramMap.get('id')!;

  readonly data = signal<SupervisionOverview | null>(null);
  readonly meetings = signal<Meeting[]>([]);
  readonly loading = signal(true);

  readonly statusMeta = MILESTONE_STATUS_META;
  readonly supervisionMeta = SUPERVISION_STATUS_META;
  readonly personName = personName;
  readonly isOverdue = isOverdue;

  readonly isSupervisor = computed(() => this.data()?.role === 'supervisor');
  /** ended / declined supervisions stay readable but cannot change */
  readonly readOnly = computed(() => {
    const s = this.data()?.supervision.status;
    return s === 'ended' || s === 'declined';
  });
  readonly statusOptions = computed(() =>
    (this.isSupervisor() ? ALL_STATUSES : STUDENT_STATUSES).map((value) => ({
      value,
      label: MILESTONE_STATUS_META[value].label,
    })),
  );

  // ---- dialogs ----
  readonly milestoneDialog = signal(false);
  readonly meetingDialog = signal(false);
  readonly saving = signal(false);
  /** the action item a file is currently being attached to */
  readonly uploadingItem = signal<string | null>(null);
  /** milestone whose documents are expanded (loaded only when opened) */
  readonly docsOpen = signal<string | null>(null);
  /** optional file picked in the add-milestone dialog */
  readonly milestoneFile = signal<File | null>(null);
  /** supervisor: a new action item for the student, created together with its file */
  readonly fileTaskDialog = signal(false);
  readonly fileTaskFile = signal<File | null>(null);
  fileTaskForm: { text: string; dueDate: Date | null } = { text: '', dueDate: null };
  milestoneForm: { title: string; description: string; dueDate: Date | null } = {
    title: '',
    description: '',
    dueDate: null,
  };
  meetingForm: { scheduledAt: Date | null; firstAgendaItem: string } = {
    scheduledAt: null,
    firstAgendaItem: '',
  };

  readonly minDate = new Date();

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.service.overview(this.id).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Could not open this supervision', detail: err?.error?.message });
        this.router.navigate(['/main/supervision']);
      },
    });
    this.service.meetings(this.id).subscribe({ next: (list) => this.meetings.set(list) });
  }

  meta(status: MilestoneStatus) {
    return MILESTONE_STATUS_META[status];
  }

  toggleDocs(m: Milestone): void {
    this.docsOpen.update((open) => (open === m._id ? null : m._id));
  }

  canEditStatus(m: Milestone): boolean {
    // once approved, only the supervisor can move it again
    return !this.readOnly() && (this.isSupervisor() || m.status !== 'approved');
  }

  setStatus(m: Milestone, status: MilestoneStatus): void {
    if (status === m.status) return;
    this.service.updateMilestone(this.id, m._id, { status }).subscribe({
      next: () => this.load(),
      error: (err) => {
        this.messages.add({ severity: 'error', summary: 'Could not update the milestone', detail: err?.error?.message });
        this.load();
      },
    });
  }

  applyTemplate(): void {
    this.service.applyTemplate(this.id, new Date().toISOString()).subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Thesis timeline added', detail: 'Adjust the due dates to your plan.' });
        this.load();
      },
      error: (err) => this.messages.add({ severity: 'error', summary: 'Could not add the template', detail: err?.error?.message }),
    });
  }

  saveMilestone(): void {
    const f = this.milestoneForm;
    if (!f.title.trim()) return;
    this.saving.set(true);
    this.service
      .addMilestone(this.id, {
        title: f.title.trim(),
        description: f.description.trim() || undefined,
        dueDate: f.dueDate?.toISOString(),
      })
      .subscribe({
        next: (milestone) => {
          const file = this.milestoneFile();
          const done = () => {
            this.saving.set(false);
            this.milestoneDialog.set(false);
            this.milestoneForm = { title: '', description: '', dueDate: null };
            this.milestoneFile.set(null);
            this.load();
          };
          if (!file) return done();
          // the milestone exists now; put the file on it
          this.service
            .uploadNewDocument(
              this.id,
              { title: file.name.replace(/\.[^.]+$/, '').slice(0, 200), milestoneId: milestone._id },
              file,
            )
            .subscribe({
              next: () => {
                this.docsOpen.set(milestone._id);
                done();
              },
              error: (err) => {
                this.messages.add({ severity: 'error', summary: 'Milestone added, but the file was not uploaded', detail: err?.error?.message });
                done();
              },
            });
        },
        error: (err) => {
          this.saving.set(false);
          this.messages.add({ severity: 'error', summary: 'Could not add the milestone', detail: err?.error?.message });
        },
      });
  }

  pickFileTaskFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!/\.(pdf|docx?)$/i.test(file.name)) {
      this.messages.add({ severity: 'warn', summary: 'Only PDF and Word (.doc, .docx) files are accepted.' });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      this.messages.add({ severity: 'warn', summary: 'The file is larger than 25 MB.' });
      return;
    }
    this.fileTaskFile.set(file);
    if (!this.fileTaskForm.text.trim()) {
      this.fileTaskForm.text = `Read ${file.name.replace(/\.[^.]+$/, '')}`.slice(0, 500);
    }
  }

  saveFileTask(): void {
    const file = this.fileTaskFile();
    const student = this.data()?.supervision.studentId;
    const text = this.fileTaskForm.text.trim();
    if (!file || !student || !text) return;
    this.saving.set(true);
    const reset = () => {
      this.saving.set(false);
      this.fileTaskDialog.set(false);
      this.fileTaskFile.set(null);
      this.fileTaskForm = { text: '', dueDate: null };
      this.load();
    };
    this.service
      .addActionItem(this.id, {
        text,
        assigneeId: student._id,
        dueDate: this.fileTaskForm.dueDate?.toISOString(),
      })
      .subscribe({
        next: (item) =>
          this.service.uploadActionItemFile(this.id, item._id, file).subscribe({
            next: () => {
              this.messages.add({ severity: 'success', summary: 'File sent', detail: 'The student was notified.' });
              reset();
            },
            error: (err) => {
              this.messages.add({ severity: 'error', summary: 'Action item added, but the file was not uploaded', detail: err?.error?.message });
              reset();
            },
          }),
        error: (err) => {
          this.saving.set(false);
          this.messages.add({ severity: 'error', summary: 'Could not add the action item', detail: err?.error?.message });
        },
      });
  }

  pickMilestoneFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!/\.(pdf|docx?)$/i.test(file.name)) {
      this.messages.add({ severity: 'warn', summary: 'Only PDF and Word (.doc, .docx) files are accepted.' });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      this.messages.add({ severity: 'warn', summary: 'The file is larger than 25 MB.' });
      return;
    }
    this.milestoneFile.set(file);
  }

  removeMilestone(m: Milestone): void {
    this.service.removeMilestone(this.id, m._id).subscribe({
      next: () => this.load(),
      error: (err) => this.messages.add({ severity: 'error', summary: 'Could not remove the milestone', detail: err?.error?.message }),
    });
  }

  saveMeeting(): void {
    const f = this.meetingForm;
    if (!f.scheduledAt) return;
    this.saving.set(true);
    this.service
      .addMeeting(this.id, {
        scheduledAt: f.scheduledAt.toISOString(),
        firstAgendaItem: f.firstAgendaItem.trim() || undefined,
      })
      .subscribe({
        next: (meeting) => {
          this.saving.set(false);
          this.meetingDialog.set(false);
          this.meetingForm = { scheduledAt: null, firstAgendaItem: '' };
          this.router.navigate(['/main/supervision', this.id, 'meetings', meeting._id]);
        },
        error: (err) => {
          this.saving.set(false);
          this.messages.add({ severity: 'error', summary: 'Could not schedule the meeting', detail: err?.error?.message });
        },
      });
  }

  /** Supervisor: attach a file (reading, template, feedback) to a task for the student. */
  attachFile(item: ActionItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!/\.(pdf|docx?)$/i.test(file.name)) {
      this.messages.add({ severity: 'warn', summary: 'Only PDF and Word (.doc, .docx) files are accepted.' });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      this.messages.add({ severity: 'warn', summary: 'The file is larger than 25 MB.' });
      return;
    }
    this.uploadingItem.set(item._id);
    this.service.uploadActionItemFile(this.id, item._id, file).subscribe({
      next: () => {
        this.uploadingItem.set(null);
        this.messages.add({ severity: 'success', summary: 'File attached', detail: 'The student was notified.' });
        this.load();
      },
      error: (err) => {
        this.uploadingItem.set(null);
        this.messages.add({ severity: 'error', summary: 'Could not attach the file', detail: err?.error?.message });
      },
    });
  }

  /** PDFs open in a new tab; Word files cannot be shown by the browser, so they download. */
  openFile(item: ActionItem, file: ActionItemFile): void {
    if (file.mimeType !== 'application/pdf') return this.downloadFile(item, file);
    // the tab is opened right away (inside the click) so the popup blocker lets it through
    const tab = window.open('', '_blank');
    this.service.actionItemFileBlob(this.id, item._id, file._id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        if (tab) tab.location.href = url;
        else window.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (err) => {
        tab?.close();
        this.messages.add({ severity: 'error', summary: 'Could not open the file', detail: err?.error?.message });
      },
    });
  }

  downloadFile(item: ActionItem, file: ActionItemFile): void {
    this.service.downloadActionItemFile(this.id, item._id, file._id, file.fileName).subscribe({
      error: (err) => this.messages.add({ severity: 'error', summary: 'Could not download the file', detail: err?.error?.message }),
    });
  }

  removeFile(item: ActionItem, file: ActionItemFile): void {
    this.confirmation.confirm({
      header: 'Remove file',
      message: `Remove "${file.fileName}" from this action item?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Remove', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary' },
      accept: () =>
        this.service.removeActionItemFile(this.id, item._id, file._id).subscribe({
          next: () => this.load(),
          error: (err) => this.messages.add({ severity: 'error', summary: 'Could not remove the file', detail: err?.error?.message }),
        }),
    });
  }

  markDone(item: ActionItem): void {
    this.service.updateActionItem(this.id, item._id, { status: 'done' }).subscribe({
      next: () => this.load(),
      error: (err) => this.messages.add({ severity: 'error', summary: 'Could not update the action item', detail: err?.error?.message }),
    });
  }

  end(): void {
    this.confirmation.confirm({
      header: 'End supervision',
      message: 'End this supervision? You can still read it afterwards, but nothing can change.',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'End supervision', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary' },
      accept: () =>
        this.service.end(this.id).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'Supervision ended', detail: 'Export a summary any time, the history stays here.' });
            this.load();
            // a good moment to celebrate it
            this.openShare();
          },
          error: (err) => this.messages.add({ severity: 'error', summary: 'Could not end the supervision', detail: err?.error?.message }),
        }),
    });
  }

  // ---- share the finished thesis on the feed ----

  readonly shareDialog = signal(false);
  readonly sharing = signal(false);
  readonly maxPostLength = MAX_POST_LENGTH;
  shareText = '';

  /** A finished (not declined) supervision can be shared by the people in it. */
  readonly canShare = computed(() => this.data()?.supervision.status === 'ended');

  openShare(): void {
    const d = this.data();
    if (!d) return;
    const title = d.supervision.title;
    const approved = d.stats?.milestonesApproved ?? 0;
    const total = d.stats?.milestonesTotal ?? 0;
    const progress = total ? ` ${approved} of ${total} milestones approved.` : '';
    this.shareText = this.isSupervisor()
      ? `I have finished supervising "${title}" with ${personName(d.supervision.studentId)}.${progress} Congratulations!`
      : `I have completed my thesis "${title}" with ${personName(d.supervision.supervisorIds[0])}.${progress} Thank you to everyone who supported me along the way!`;
    this.shareDialog.set(true);
  }

  publishShare(): void {
    const content = this.shareText.trim();
    if (!content) return;
    this.sharing.set(true);
    this.posts.create(content).subscribe({
      next: () => {
        this.sharing.set(false);
        this.shareDialog.set(false);
        this.messages.add({ severity: 'success', summary: 'Posted to your feed' });
      },
      error: (err) => {
        this.sharing.set(false);
        this.messages.add({ severity: 'error', summary: 'Could not post', detail: err?.error?.message });
      },
    });
  }

  readonly exporting = signal(false);
  readonly exportItems: MenuItem[] = [
    { label: 'PDF document (.pdf)', icon: 'pi pi-file-pdf', command: () => this.exportSummary('pdf') },
    { label: 'Word document (.docx)', icon: 'pi pi-file-word', command: () => this.exportSummary('docx') },
  ];

  /** Downloads a summary the student can keep after the supervision closes, as PDF or Word. */
  exportSummary(format: 'pdf' | 'docx'): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.service.exportSummary(this.id).subscribe({
      next: async (d) => {
        const date = (v?: string | null) => (v ? new Date(v).toLocaleString() : 'no date');
        const summary: SummaryData = {
          title: d['supervision']?.title ?? 'Supervision',
          student: personName(d['supervision']?.studentId),
          supervisors: (d['supervision']?.supervisorIds ?? []).map(personName).join(', '),
          exportedAt: new Date().toLocaleString(),
          milestones: d['milestones'].map((m: Milestone) => ({
            status: this.statusMeta[m.status].label,
            title: m.title,
            due: date(m.dueDate),
            description: m.description || undefined,
          })),
          meetings: d['meetings'].map((m: Meeting) => ({
            date: date(m.scheduledAt),
            status: m.status,
            agenda: m.agenda.map((a) => a.text),
            notes: m.notes || undefined,
          })),
          actionItems: d['actionItems'].map((i: ActionItem) => ({
            status: i.status,
            text: i.text,
            assignee: personName(i.assigneeId),
            due: date(i.dueDate),
          })),
        };
        try {
          const util = await import('../../editor/summary-export.util');
          await (format === 'pdf' ? util.exportSummaryPdf(summary) : util.exportSummaryDocx(summary));
        } catch {
          this.messages.add({ severity: 'error', summary: 'Could not create the file' });
        } finally {
          this.exporting.set(false);
        }
      },
      error: (err) => {
        this.exporting.set(false);
        this.messages.add({ severity: 'error', summary: 'Could not export', detail: err?.error?.message });
      },
    });
  }
}
