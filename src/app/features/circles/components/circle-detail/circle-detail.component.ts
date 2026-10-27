import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import {
  Circle,
  CircleMemberRow,
  CircleSession,
  STAGE_LABEL,
  WEEKDAY_OPTIONS,
  personId,
  personName,
} from '../../models/circle.model';
import { CirclesService } from '../../services/circles.service';
import { CircleFormComponent } from '../circle-form/circle-form.component';

/** One circle: schedule (also in the viewer's own zone), members, meeting link and sessions. */
@Component({
  selector: 'app-circle-detail',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    AvatarModule,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    SkeletonModule,
    TagModule,
    TextareaModule,
    CircleFormComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './circle-detail.component.html',
})
export class CircleDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(CirclesService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);

  circleId!: string;

  readonly circle = signal<Circle | null>(null);
  readonly sessions = signal<CircleSession[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly busy = signal(false);
  readonly editOpen = signal(false);
  readonly reportOpen = signal(false);
  reportReason = '';

  readonly stageLabel = STAGE_LABEL;
  readonly personName = personName;
  readonly personId = personId;

  readonly isOwner = computed(() => this.circle()?.myRole === 'owner');
  readonly isMember = computed(() => ['active', 'paused'].includes(this.circle()?.myStatus ?? ''));
  readonly isFull = computed(() => {
    const c = this.circle();
    return !!c && (c.memberCount ?? 0) >= c.maxMembers;
  });
  readonly pending = computed(() => (this.circle()?.members ?? []).filter((m) => m.status === 'pending'));
  readonly seated = computed(() => (this.circle()?.members ?? []).filter((m) => m.status !== 'pending'));

  ngOnInit(): void {
    this.circleId = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.service.get(this.circleId).subscribe({
      next: (circle) => {
        this.circle.set(circle);
        this.loading.set(false);
        if (['active', 'paused'].includes(circle.myStatus ?? '')) this.loadSessions();
        else this.sessions.set([]);
      },
      error: (err) => {
        this.loadError.set(err?.error?.message ?? 'Could not load this circle');
        this.loading.set(false);
      },
    });
  }

  private loadSessions(): void {
    this.service.sessions(this.circleId).subscribe({
      next: (list) => this.sessions.set(list),
      error: () => this.sessions.set([]),
    });
  }

  scheduleText(c: Circle): string {
    const day = WEEKDAY_OPTIONS.find((d) => d.value === c.schedule.weekday)?.label ?? '';
    return `Every ${day} at ${c.schedule.time} (${c.schedule.timezone}), ${c.schedule.durationMin} min`;
  }

  goalsSet(s: CircleSession): number {
    return s.entries.filter((e) => !!e.goal).length;
  }

  private fail(summary: string, err: any): void {
    this.busy.set(false);
    this.messages.add({ severity: 'error', summary, detail: err?.error?.message ?? 'Something went wrong' });
  }

  // ---------------- membership ----------------

  join(): void {
    this.busy.set(true);
    this.service.join(this.circleId).subscribe({
      next: () => {
        this.busy.set(false);
        const request = this.circle()?.visibility === 'invite';
        this.messages.add({ severity: 'success', summary: request ? 'Request sent' : 'You joined the circle' });
        this.load();
      },
      error: (err) => {
        this.fail('Could not join', err);
        this.load();
      },
    });
  }

  confirmLeave(): void {
    this.confirmation.confirm({
      header: 'Leave circle',
      message: 'Leave this circle? You can join again later if there is a seat.',
      icon: 'pi pi-sign-out',
      acceptButtonProps: { label: 'Leave', severity: 'danger' },
      rejectButtonProps: { label: 'Stay', severity: 'secondary', text: true },
      accept: () =>
        this.service.leave(this.circleId).subscribe({
          next: () => this.router.navigate(['/main/circles/mine']),
          error: (err) => this.fail('Could not leave', err),
        }),
    });
  }

  member(m: CircleMemberRow, action: 'approve' | 'remove'): void {
    this.service.updateMember(this.circleId, personId(m.userId), action).subscribe({
      next: () => this.load(),
      error: (err) => this.fail('Could not update the member', err),
    });
  }

  confirmRemove(m: CircleMemberRow): void {
    this.confirmation.confirm({
      header: 'Remove member',
      message: `Remove ${personName(m.userId)} from the circle?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Remove', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () => this.member(m, 'remove'),
    });
  }

  // ---------------- owner ----------------

  onEdited(): void {
    this.editOpen.set(false);
    this.messages.add({ severity: 'success', summary: 'Circle updated' });
    this.load();
  }

  confirmClose(): void {
    this.confirmation.confirm({
      header: 'Close circle',
      message: 'Close this circle? Future sessions are cancelled. Past goals and results are kept.',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Close circle', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () =>
        this.service.close(this.circleId).subscribe({
          next: () => this.router.navigate(['/main/circles']),
          error: (err) => this.fail('Could not close the circle', err),
        }),
    });
  }

  setSession(s: CircleSession, status: 'cancelled' | 'done'): void {
    this.service.updateSession(this.circleId, s._id, status).subscribe({
      next: () => this.loadSessions(),
      error: (err) => this.fail('Could not update the session', err),
    });
  }

  canCancel(s: CircleSession): boolean {
    return s.status === 'planned' && new Date(s.startsAt).getTime() + s.durationMin * 60000 > Date.now();
  }

  canMarkDone(s: CircleSession): boolean {
    return s.status === 'planned' && new Date(s.startsAt).getTime() <= Date.now();
  }

  // ---------------- report ----------------

  sendReport(): void {
    const reason = this.reportReason.trim();
    if (reason.length < 5) return;
    this.service.report(this.circleId, reason).subscribe({
      next: () => {
        this.reportOpen.set(false);
        this.reportReason = '';
        this.messages.add({ severity: 'success', summary: 'Report sent', detail: 'A moderator will take a look.' });
      },
      error: (err) => this.fail('Could not send the report', err),
    });
  }
}
