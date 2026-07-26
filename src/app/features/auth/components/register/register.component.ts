
// Angular basics
import { FormGroup, FormControl, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

// Prime Ng
import { CheckboxModule } from 'primeng/checkbox';
import { passwordMatchValidator } from '../../utils/helpers';

// Insides
import { SpinnerComponent } from '../../../../shared/components/ui/spinner/spinner.component'
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';


@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    CheckboxModule,
    FormsModule,
    CommonModule,
    SpinnerComponent
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
  providers: [HttpClient]
})
export class RegisterComponent {

  // variables
  showPassword = false;
  showconfirmPassword = false;
  checked = false;
  loading = signal(false);

  // services
  private authService = inject(AuthService);
  private toastService = inject(ToastService)

  // register form group
  registerForm = new FormGroup({

    firstName: new FormControl('',
      [Validators.required]
    ),

    lastName: new FormControl('',
      [Validators.required]
    ),

    username: new FormControl('',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.pattern(/^_[a-zA-Z0-9_]+$/)
      ]
    ),
    email: new FormControl('',
      [
        Validators.email,
        Validators.required
      ]
    ),

    password: new FormControl('',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/
        )

      ]
    ),

    confirmPassword: new FormControl('',
      [
        Validators.required
      ]
    )

  }, { validators: passwordMatchValidator })


  register() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading.set(true)

    const registerPayload = {
      firstName: this.registerForm.value.firstName!,
      lastName: this.registerForm.value.lastName!,
      username: this.registerForm.value.username!,
      email: this.registerForm.value.email!,
      password: this.registerForm.value.password!,
    }

    this.authService.register(registerPayload).subscribe({
      next: (response) => {
        this.toastService.success('Successfull registration', response.message)
        this.loading.set(false);

      },

      error: (err) => {
        this.toastService.error('Registration fail', err.error.message);
        this.loading.set(false);
      }
    })

  }

  get passwordControl() {
    return this.registerForm.get('password');
  }

  get confirmPasswordControl() {
    return this.registerForm.get('confirmPassword');
  }

  get usernameControl() {
    return this.registerForm.get('username');
  }

  get firstNameControl() {
    return this.registerForm.get('firstName');
  }

  get lastNameControl() {
    return this.registerForm.get('lastName');
  }

  get emailControl() {
    return this.registerForm.get('email');
  }
}