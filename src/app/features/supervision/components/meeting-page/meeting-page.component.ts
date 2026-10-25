import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';

import { MessageService } from 'primeng/api';
import {
  MeetingStatus,
  MeetingWithItems,
  PersonRef,
  Supervision,
  SupervisionRole,
  isOverdue,
  personName,
} from '../../models/supervision.model';
import { SupervisionService } from '../../services/supervision.service';
import { DocumentsSectionComponent } from '../documents-section/documents-section.component';

/** Agenda both sides can add to, notes written afterwards, and the action items that came out of it. */
@Component({
  selector: 'app-meeting-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    Textarea,
    DocumentsSectionComponent,
  ],
  templateUrl: './meeting-page.component.html',
})
export class MeetingPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(SupervisionService);
  private readonly messages = inject(MessageService);

  readonly id = this.route.snapshot.paramMap.get('id')!;
  readonly meetingId = this.route.snapshot.paramMap.get('meetingId')!;

  readonly meeting = signal<MeetingWithItems | null>(null);
  readonly supervision = signal<Supervision | null>(null);
  readonly loading = signal(true);
  readonly savingNotes = signal(false);

  readonly personName = personName;
  readonly isOverdue = isOverdue;

  readonly readOnly = computed(() => {
    const s = this.supervision()?.status;
    return s === 'ended' || s === 'declined';
  });
  readonly role = signal<SupervisionRole | null>(null);
  readonly isStudent = computed(() => this.role() === 'student');
  readonly people = computed<{ value: string; label: string }[]>(() => {
    const s = this.supervision();
    if (!s) return [];
    const all: PersonRef[] = [s.studentId, ...s.supervisorIds];
    return all.map((p) => ({ value: p._id, label: personName(p) }));
  });
  readonly statusOptions: { value: MeetingStatus; label: string }[] = [
    { value: 'planned', label: 'Planned' },
    { value: 'done', label: 'Done' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  newAgenda = '';
  notes = '';
  newItem: { text: string; assigneeId: string | null; dueDate: Date | null } = {
    text: '',
    assigneeId: null,
    dueDate: null,
  };

  ngOnInit(): void {
    this.service.overview(this.id).subscribe({
      next: (o) => {
        this.supervision.set(o.supervision);
        this.role.set(o.role);
      },
      error: () => this.router.navigate(['/main/supervision']),
    });
    this.load();
  }

  private load(): void {
    this.service.meeting(this.id, this.meetingId).subscribe({
      next: (m) => {
        this.meeting.set(m);
        this.notes = m.notes ?? '';
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Could not open this meeting', detail: err?.error?.message });
        this.router.navigate(['/main/supervision', this.id]);
      },
    });
  }

  private fail(title: string) {
    return (err: { error?: { message?: string } }) => this.messages.add({ severity: 'error', summary: title, detail: err?.error?.message });
  }

  // ---- agenda ----
  addAgenda(): void {
    const text = this.newAgenda.trim();
    if (!text) return;
    this.service.addAgendaItem(this.id, this.meetingId, text).subscribe({
      next: () => {
        this.newAgenda = '';
        this.load();
      },
      error: this.fail('Could not add the agenda item'),
    });
  }

  removeAgenda(itemId: string): void {
    this.service.removeAgendaItem(this.id, this.meetingId, itemId).subscribe({
      next: () => this.load(),
      error: this.fail('Could not remove the agenda item'),
    });
  }

  // ---- meeting ----
  setStatus(status: MeetingStatus): void {
    this.service.updateMeeting(this.id, this.meetingId, { status }).subscribe({
      next: () => this.load(),
      error: this.fail('Could not update the meeting'),
    });
  }

  reschedule(date: Date | null): void {
    if (!date) return;
    this.service.updateMeeting(this.id, this.meetingId, { scheduledAt: date.toISOString() }).subscribe({
      next: () => this.load(),
      error: this.fail('Could not reschedule'),
    });
  }

  saveNotes(): void {
    this.savingNotes.set(true);
    this.service.updateMeeting(this.id, this.meetingId, { notes: this.notes }).subscribe({
      next: () => {
        this.savingNotes.set(false);
        this.messages.add({ severity: 'success', summary: 'Notes saved' });
      },
      error: (err) => {
        this.savingNotes.set(false);
        this.fail('Could not save the notes')(err);
      },
    });
  }

  // ---- action items ----
  addItem(): void {
    const f = this.newItem;
    if (!f.text.trim() || !f.assigneeId) return;
    this.service
      .addActionItem(this.id, {
        text: f.text.trim(),
        assigneeId: f.assigneeId,
        meetingId: this.meetingId,
        dueDate: f.dueDate?.toISOString(),
      })
      .subscribe({
        next: () => {
          this.newItem = { text: '', assigneeId: f.assigneeId, dueDate: null };
          this.load();
        },
        error: this.fail('Could not add the action item'),
      });
  }

  toggleItem(itemId: string, done: boolean): void {
    this.service.updateActionItem(this.id, itemId, { status: done ? 'open' : 'done' }).subscribe({
      next: () => this.load(),
      error: this.fail('Could not update the action item'),
    });
  }

  removeItem(itemId: string): void {
    this.service.removeActionItem(this.id, itemId).subscribe({
      next: () => this.load(),
      error: this.fail('Could not remove the action item'),
    });
  }
}
