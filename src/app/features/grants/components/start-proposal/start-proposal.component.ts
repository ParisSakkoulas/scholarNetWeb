import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Team } from '../../../teams/models/team.model';
import { TeamsService } from '../../../teams/services/teams.service';
import { GrantCall } from '../../models/grant.model';
import { Proposal } from '../../models/proposal.model';
import { ProposalsService } from '../../services/proposals.service';

/** "Start proposal": a title, optionally a team (which also gets a Kanban board), and an internal deadline. */
@Component({
  selector: 'app-start-proposal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, DatePickerModule, DialogModule, InputTextModule, SelectModule],
  templateUrl: './start-proposal.component.html',
})
export class StartProposalComponent implements OnInit {
  @Input({ required: true }) call!: GrantCall;
  @Output() started = new EventEmitter<Proposal>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly proposals = inject(ProposalsService);
  private readonly teamsService = inject(TeamsService);

  readonly teams = signal<{ label: string; value: string | null }[]>([{ label: 'Personal (only you)', value: null }]);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly today = new Date();

  form!: ReturnType<StartProposalComponent['buildForm']>;

  private buildForm() {
    return this.fb.group({
      title: [this.call.title, [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      teamId: [null as string | null],
      internalDeadline: [null as Date | null],
    });
  }

  ngOnInit(): void {
    this.form = this.buildForm();
    this.teamsService.getMyTeams().subscribe({
      next: (teams: Team[]) =>
        this.teams.set([
          { label: 'Personal (only you)', value: null },
          ...teams.map((t) => ({ label: `Team: ${t.name}`, value: t._id })),
        ]),
      error: () => {
        /* personal proposals still work */
      },
    });
  }

  get maxInternal(): Date {
    return new Date(this.call.deadline);
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);
    this.proposals
      .start(this.call._id, {
        title: v.title!.trim(),
        ...(v.teamId ? { teamId: v.teamId } : {}),
        ...(v.internalDeadline ? { internalDeadline: v.internalDeadline.toISOString() } : {}),
      })
      .subscribe({
        next: (proposal) => {
          this.submitting.set(false);
          this.started.emit(proposal);
        },
        error: (err) => {
          this.submitting.set(false);
          const message = err?.error?.message;
          this.error.set(Array.isArray(message) ? message.join('. ') : (message ?? 'Something went wrong'));
        },
      });
  }
}
