import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import {
  CAREER_STAGE_OPTIONS,
  DISCLAIMER,
  FUNDING_TYPE_OPTIONS,
  GrantCall,
  GrantPayload,
  countryOptions,
} from '../../models/grant.model';
import { GrantsService } from '../../services/grants.service';

export type GrantFormMode = 'create' | 'submit' | 'edit';

const HTTPS_URL = /^https:\/\/\S+$/;

/**
 * One form, three uses: an admin adds a call (`create`), a user proposes one for review (`submit`),
 * an admin edits one (`edit`).
 */
@Component({
  selector: 'app-grant-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    AutoCompleteModule,
    ButtonModule,
    DatePickerModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    MultiSelectModule,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './grant-form.component.html',
})
export class GrantFormComponent implements OnInit {
  @Input() mode: GrantFormMode = 'create';
  @Input() grant: GrantCall | null = null;
  @Output() saved = new EventEmitter<GrantCall>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(GrantsService);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  /** Set once the user pressed the submit button on an incomplete form. */
  readonly attempted = signal(false);

  readonly countries = countryOptions();
  readonly careerStages = CAREER_STAGE_OPTIONS;
  readonly fundingTypes = FUNDING_TYPE_OPTIONS;
  readonly disclaimer = DISCLAIMER;
  readonly today = new Date();

  // built in ngOnInit: @Input() is not set yet when field initializers run
  form!: ReturnType<GrantFormComponent['buildForm']>;

  ngOnInit(): void {
    this.form = this.buildForm();
  }

  get header(): string {
    return this.mode === 'edit' ? 'Edit call' : this.mode === 'submit' ? 'Submit a call for review' : 'Add a call';
  }

  private buildForm() {
    const g = this.grant;
    const date = (v?: string) => (v ? new Date(v) : null);
    return this.fb.group({
      title: [g?.title ?? '', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      funder: [g?.funder ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
      url: [g?.url ?? 'https://', [Validators.required, Validators.pattern(HTTPS_URL), Validators.maxLength(1000)]],
      description: [g?.description ?? '', [Validators.required, Validators.minLength(10), Validators.maxLength(4000)]],
      countries: [g?.countries ?? ([] as string[])],
      careerStages: [g?.careerStages ?? ([] as string[])],
      fields: [g?.fields ?? ([] as string[])],
      fundingType: [g?.fundingType ?? 'project', Validators.required],
      amountMin: [g?.amount?.min ?? (null as number | null)],
      amountMax: [g?.amount?.max ?? (null as number | null)],
      currency: [g?.amount?.currency ?? 'EUR', [Validators.pattern(/^[A-Za-z]{3}$/)]],
      opensAt: [date(g?.opensAt) as Date | null],
      deadline: [date(g?.deadline) as Date | null, Validators.required],
    });
  }

  /** Plain-language list of what still blocks the form. */
  problems(): string[] {
    if (!this.form) return [];
    const c = this.form.controls;
    const list: string[] = [];
    if (c.title.invalid) list.push('Title: at least 3 characters');
    if (c.funder.invalid) list.push('Funder: at least 2 characters');
    if (c.url.invalid) list.push('Official call page: a link starting with https://');
    if (c.description.invalid) {
      list.push(`Description: at least 10 characters (you have ${(c.description.value ?? '').trim().length})`);
    }
    if (c.deadline.invalid) list.push('Deadline: pick a date from the calendar');
    if (c.currency.invalid) list.push('Currency: 3 letters, for example EUR');
    return list;
  }

  submit(): void {
    if (this.submitting()) return;
    if (this.form.invalid) {
      // show every problem instead of leaving a dead button
      this.form.markAllAsTouched();
      this.attempted.set(true);
      return;
    }
    const v = this.form.getRawValue();
    this.error.set(null);

    const hasAmount = v.amountMin != null || v.amountMax != null;
    if (hasAmount && v.amountMin != null && v.amountMax != null && v.amountMin > v.amountMax) {
      this.error.set('The minimum amount cannot be higher than the maximum.');
      return;
    }

    const payload: GrantPayload = {
      title: v.title!,
      funder: v.funder!,
      url: v.url!,
      description: v.description!,
      countries: v.countries as string[],
      careerStages: v.careerStages as GrantPayload['careerStages'],
      fields: v.fields as string[],
      fundingType: v.fundingType as GrantPayload['fundingType'],
      ...(hasAmount
        ? {
            amount: {
              ...(v.amountMin != null ? { min: v.amountMin } : {}),
              ...(v.amountMax != null ? { max: v.amountMax } : {}),
              currency: (v.currency || 'EUR').toUpperCase(),
            },
          }
        : {}),
      ...(v.opensAt ? { opensAt: v.opensAt.toISOString() } : {}),
      deadline: v.deadline!.toISOString(),
    };

    this.submitting.set(true);
    const request$ =
      this.mode === 'edit'
        ? this.service.update(this.grant!._id, payload)
        : this.mode === 'submit'
          ? this.service.submit(payload)
          : this.service.create(payload);

    request$.subscribe({
      next: (grant) => {
        this.submitting.set(false);
        this.saved.emit(grant);
      },
      error: (err) => {
        this.submitting.set(false);
        const message = err?.error?.message;
        this.error.set(Array.isArray(message) ? message.join('. ') : (message ?? 'Something went wrong'));
      },
    });
  }
}
