import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import {
  Circle,
  CirclePayload,
  DEFAULT_MAX_MEMBERS,
  MAX_MEMBERS_LIMIT,
  STAGE_OPTIONS,
  VISIBILITY_OPTIONS,
  WEEKDAY_OPTIONS,
} from '../../models/circle.model';
import { CirclesService } from '../../services/circles.service';

export const browserTimezone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const timezoneOptions = (): string[] => {
  const all = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.(
    'timeZone',
  );
  const zones = all?.length ? all : [browserTimezone()];
  return zones.includes(browserTimezone()) ? zones : [browserTimezone(), ...zones];
};

/** Create or edit a circle. The schedule is entered in one time zone; the API stores sessions in UTC. */
@Component({
  selector: 'app-circle-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './circle-form.component.html',
})
export class CircleFormComponent implements OnInit {
  @Input() circle: Circle | null = null;
  @Output() saved = new EventEmitter<Circle>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CirclesService);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly stageOptions = STAGE_OPTIONS;
  readonly visibilityOptions = VISIBILITY_OPTIONS;
  readonly weekdayOptions = WEEKDAY_OPTIONS;
  readonly timezones = timezoneOptions();
  readonly maxLimit = MAX_MEMBERS_LIMIT;

  // built in ngOnInit: @Input() is not set yet when field initializers run
  form!: ReturnType<CircleFormComponent['buildForm']>;

  ngOnInit(): void {
    this.form = this.buildForm();
  }

  get isEdit(): boolean {
    return !!this.circle;
  }

  private buildForm() {
    const c = this.circle;
    return this.fb.nonNullable.group({
      name: [c?.name ?? '', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
      description: [c?.description ?? '', [Validators.maxLength(1000)]],
      field: [c?.field ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      stage: [c?.stage ?? ('thesis' as Circle['stage']), Validators.required],
      visibility: [c?.visibility ?? ('public' as Circle['visibility']), Validators.required],
      maxMembers: [
        c?.maxMembers ?? DEFAULT_MAX_MEMBERS,
        [Validators.required, Validators.min(2), Validators.max(MAX_MEMBERS_LIMIT)],
      ],
      weekday: [c?.schedule.weekday ?? 2, Validators.required],
      time: [c?.schedule.time ?? '18:00', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
      durationMin: [c?.schedule.durationMin ?? 90, [Validators.required, Validators.min(15), Validators.max(240)]],
      timezone: [c?.schedule.timezone ?? browserTimezone(), Validators.required],
      meetingUrl: [c?.meetingUrl ?? '', [Validators.pattern(/^$|^https?:\/\/\S+$/)]],
    });
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.error.set(null);

    const v = this.form.getRawValue();
    const payload: CirclePayload = {
      name: v.name,
      description: v.description || undefined,
      field: v.field,
      stage: v.stage,
      visibility: v.visibility,
      maxMembers: v.maxMembers,
      schedule: {
        weekday: v.weekday,
        time: v.time,
        durationMin: v.durationMin,
        timezone: v.timezone,
      },
      meetingUrl: v.meetingUrl || undefined,
    };

    const request$ = this.circle
      ? this.service.update(this.circle._id, payload)
      : this.service.create(payload);

    request$.subscribe({
      next: (circle) => {
        this.submitting.set(false);
        this.saved.emit(circle);
      },
      error: (err) => {
        this.submitting.set(false);
        const message = err?.error?.message;
        this.error.set(Array.isArray(message) ? message.join('. ') : (message ?? 'Something went wrong'));
      },
    });
  }
}
