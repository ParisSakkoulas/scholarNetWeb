import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { CAREER_STAGE_OPTIONS, FUNDING_TYPE_OPTIONS, FundingType, countryOptions } from '../../models/grant.model';
import { GrantsService } from '../../services/grants.service';

/** The short form behind "For you" and the alerts. */
@Component({
  selector: 'app-grant-preferences',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    AutoCompleteModule,
    ButtonModule,
    DialogModule,
    MultiSelectModule,
    SelectModule,
    SkeletonModule,
    ToggleSwitchModule,
  ],
  templateUrl: './grant-preferences.component.html',
})
export class GrantPreferencesComponent implements OnInit {
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(GrantsService);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly countries = countryOptions();
  readonly careerStages = CAREER_STAGE_OPTIONS;
  readonly fundingTypes = FUNDING_TYPE_OPTIONS;

  readonly form = this.fb.group({
    countries: [[] as string[]],
    careerStage: [null as string | null],
    fields: [[] as string[]],
    fundingTypes: [[] as string[]],
    alertsEnabled: [true],
  });

  ngOnInit(): void {
    this.service.preferences().subscribe({
      next: (p) => {
        this.form.patchValue({
          countries: p.countries ?? [],
          careerStage: p.careerStage ?? null,
          fields: p.fields ?? [],
          fundingTypes: p.fundingTypes ?? [],
          alertsEnabled: p.alertsEnabled ?? true,
        });
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load your preferences');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (this.submitting()) return;
    const v = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set(null);
    this.service
      .setPreferences({
        countries: v.countries ?? [],
        careerStage: v.careerStage,
        fields: v.fields ?? [],
        fundingTypes: (v.fundingTypes ?? []) as FundingType[],
        alertsEnabled: v.alertsEnabled ?? true,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.saved.emit();
        },
        error: (err) => {
          this.submitting.set(false);
          const message = err?.error?.message;
          this.error.set(Array.isArray(message) ? message.join('. ') : (message ?? 'Something went wrong'));
        },
      });
  }
}
