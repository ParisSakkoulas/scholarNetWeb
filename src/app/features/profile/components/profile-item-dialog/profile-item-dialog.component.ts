import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';

import { ProfileSectionKey } from '../../../../core/models/profile.model';
import { ProfileService } from '../../../../core/services/profile.service';
import { PROFILE_SECTION_FORMS } from '../../configs/profile-section-forms';

/** One dialog for adding a position, education, skill or interest — the
 *  fields come from PROFILE_SECTION_FORMS based on the `section` input. */
@Component({
  selector: 'sn-profile-item-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    DatePickerModule,
    CheckboxModule,
    ButtonModule,
  ],
  templateUrl: './profile-item-dialog.component.html',
  styleUrl: './profile-item-dialog.component.css',
})
export class ProfileItemDialogComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly messages = inject(MessageService);

  readonly section = input.required<ProfileSectionKey>();
  /** existing entry to edit; omit to add a new one */
  readonly item = input<Record<string, any> | null>(null);

  readonly saved = output<void>();
  readonly closed = output<void>();

  readonly config = computed(() => PROFILE_SECTION_FORMS[this.section()]);
  readonly isEdit = computed(() => !!this.item());
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  form = new FormGroup<Record<string, FormControl>>({});

  ngOnInit(): void {
    const existing = this.item();
    for (const field of this.config().fields) {
      let initial: unknown = field.type === 'checkbox' ? false : null;
      const current = existing?.[field.key];
      if (current !== undefined && current !== null) {
        initial = field.type === 'date' ? new Date(current) : current;
      }
      this.form.addControl(
        field.key,
        new FormControl(
          initial,
          field.required ? Validators.required : [],
        ),
      );
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: Record<string, unknown> = {};

    for (const field of this.config().fields) {
      const value = raw[field.key];
      if (value === null || value === '' || value === undefined) {
        // when editing, a cleared optional field must be sent as null to unset it
        if (this.isEdit() && !field.required) payload[field.key] = null;
        continue;
      }
      payload[field.key] =
        field.type === 'date' ? (value as Date).toISOString() : value;
    }

    // a current position has no end date
    if (payload['current']) payload['endDate'] = this.isEdit() ? null : undefined;
    if (payload['endDate'] === undefined) delete payload['endDate'];

    this.submitting.set(true);
    this.error.set(null);

    const request$ = this.isEdit()
      ? this.profileService.updateSection(this.section(), this.item()!['_id'], payload)
      : this.profileService.addSection(this.section(), payload);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.messages.add({
          severity: 'success',
          summary: this.isEdit() ? 'Updated' : 'Added',
          detail: `Your ${this.config().noun} was ${this.isEdit() ? 'updated' : 'added'}.`,
        });
        this.saved.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        const message = err?.error?.message ?? 'Something went wrong';
        this.error.set(message);
        this.messages.add({ severity: 'error', summary: 'Could not save', detail: message });
      },
    });
  }
}
