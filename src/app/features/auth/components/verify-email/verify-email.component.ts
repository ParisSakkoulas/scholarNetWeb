import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { Button } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  imports: [
    RouterLink,
    NgTemplateOutlet,
    Button,
    ProgressSpinner,
    Tag,
    ToastModule,
  ],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css',
  providers: [MessageService],
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private router = inject(Router);
  private messageService = inject(MessageService);

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
        this.messageService.add({
          severity: 'Verification success',
          summary: 'Success',
          detail: response.message,
        });
        setTimeout(() => this.router.navigate(['/auth/login']), 6000);
      },
      error: (err) => {
        this.status.set('error');
        this.errorMessage.set(err.error?.message ?? 'Verification failed.');
        this.messageService.add({
          severity: 'Verification failed',
          summary: 'Failed',
          detail: err.error?.message,
        });
      },
    });
  }
}
