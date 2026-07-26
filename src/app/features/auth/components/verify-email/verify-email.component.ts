import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-verify-email',
  imports: [RouterLink],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css'
})
export class VerifyEmailComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  status = signal<'verifying' | 'success' | 'error'>('verifying');
  errorMessage = signal<string>('');

  ngOnInit() {

    const token = this.route.snapshot.paramMap.get('token');

    if (!token) {
      this.status.set('error');
      this.errorMessage.set('No verification token found.');
      return;
    }


    this.authService.verifyEmai(token).subscribe({
      next: (response) => {
        this.status.set('success');
        this.toastService.success("Verification success", response.message)
        setTimeout(() => this.router.navigate(['/auth/login']), 6000);
      },
      error: (err) => {
        this.status.set('error');
        this.errorMessage.set(err.error?.message ?? 'Verification failed.');
        this.toastService.error('Verification failed', err.error?.message);
      }
    });



  }

}
