import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

type UnlockState = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-unlock-account',
  imports: [
    CardModule,
    ButtonModule,
    ProgressSpinnerModule,
    MessageModule,
    CommonModule,
    RouterLink,
  ],
  templateUrl: './unlock-account.component.html',
  styleUrl: './unlock-account.component.css',
})
export class UnlockAccountComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  readonly state = signal<UnlockState>('loading');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.state.set('error');
      return;
    }

    this.authService.unlock(token).subscribe({
      next: () => this.state.set('success'),
      error: () => this.state.set('error'),
    });
  }
}
