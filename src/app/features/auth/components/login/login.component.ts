// Angular basics
import {
  FormGroup,
  FormControl,
  ReactiveFormsModule,
  FormsModule,
  Validators,
} from '@angular/forms';
import { Component, inject, InjectionToken, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { InputTextModule } from 'primeng/inputtext';

import { AuthService } from '../../../../core/services/auth.service';
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner.component';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    PasswordModule,
    DividerModule,
    ButtonModule,
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    SpinnerComponent,
    TagModule,
    MessageModule,
    InputTextModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  providers: [HttpClient],
})
export class LoginComponent {
  // services
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  // variables
  showPassword = false;
  loading = signal(false);

  loginForm = new FormGroup({
    identifier: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required]),
  });

  get identifierControl() {
    return this.loginForm.get('identifier');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  login() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    const loginPayload = {
      identifier: this.loginForm.value.identifier!,
      password: this.loginForm.value.password!,
    };

    this.authService.login(loginPayload).subscribe({
      next: (response) => {
        // this.toastService.success("Welcome back!");
        // console.log(response)
        this.loading.set(false);
        this.router.navigate(['/main/profile/' + response.user.id]);
      },

      error: (err) => {
        this.toastService.error('Auth Failed', err.error.message);
        this.loading.set(false);
      },
    });
  }
}
