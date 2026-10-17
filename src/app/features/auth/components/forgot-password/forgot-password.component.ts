import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CardModule,
    InputTextModule,
    ButtonModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
    CommonModule,
    FormsModule,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css',
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  loading = signal(false);
  emailSent = signal(false);
  errorMessage = signal('');

  forgotPasswordForm = this.fb.nonNullable.group({
    identifier: ['', [Validators.required, Validators.email]],
  });

  get identifier() {
    return this.forgotPasswordForm.controls.identifier;
  }

  forgotPassword() {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService
      .forgotPassword(this.forgotPasswordForm.controls.identifier.value)
      .subscribe({
        next: () => {
          this.emailSent.set(true);
          this.loading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message ?? 'Something went wrong.');
          this.loading.set(false);
        },
      });
  }
}
