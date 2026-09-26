import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Team } from '../../models/team.model';
import { TeamsService } from '../../services/teams.service';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-team-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ButtonModule,
  ],
  templateUrl: './team-form.component.html',
  styleUrl: './team-form.component.css',
})
export class TeamFormComponent implements OnInit {
  @Input() team: Team | null = null;
  @Output() created = new EventEmitter<Team>();
  @Output() updated = new EventEmitter<Team>();
  @Output() cancelled = new EventEmitter<void>();

  submitting = signal(false);
  error = signal<string | null>(null);

  visibilityOptions = [
    { label: 'Private', value: 'private' },
    { label: 'Public', value: 'public' },
  ];

  private fb = inject(FormBuilder);
  private teamsService = inject(TeamsService);

  // Declared here (typed, empty) but actually filled in ngOnInit — @Input()
  // isn't set yet when class field initializers run, only by the time
  // ngOnInit fires. Building the form here with `this.team?.x` always saw
  // `team` as null, which is why edit mode never showed values.
  form!: ReturnType<typeof this.buildForm>;

  ngOnInit(): void {
    this.form = this.buildForm();
  }

  private buildForm() {
    return this.fb.nonNullable.group({
      name: [
        this.team?.name ?? '',
        [Validators.required, Validators.maxLength(80)],
      ],
      slug: [
        this.team?.slug ?? '',
        [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)],
      ],
      description: [this.team?.description ?? ''],
      visibility: [
        this.team?.visibility ?? ('private' as 'private' | 'public'),
      ],
    });
  }

  get isEdit(): boolean {
    return !!this.team;
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);

    const payload = this.form.getRawValue();

    const request$ = this.isEdit
      ? this.teamsService.updateTeam(this.team!._id, payload)
      : this.teamsService.createTeam(payload as any);

    request$.subscribe({
      next: (team) => {
        this.submitting.set(false);
        this.isEdit ? this.updated.emit(team) : this.created.emit(team);
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.message ?? 'Something went wrong');
      },
    });
  }

  onSlugInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-');
    this.form.patchValue({ slug: value }, { emitEvent: false });
  }
}
