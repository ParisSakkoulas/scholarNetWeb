import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { DialogModule } from 'primeng/dialog';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectButtonModule } from 'primeng/selectbutton';

import {
  FollowListMode,
  FollowUser,
} from '../../../../core/models/follow.model';
import { FollowsService } from '../../../../core/services/follows.service';

/** Followers / Following list of a user, with a switch between the two. */
@Component({
  selector: 'sn-follow-list-dialog',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    DialogModule,
    SelectButtonModule,
    PaginatorModule,
    AvatarModule,
  ],
  templateUrl: './follow-list-dialog.component.html',
})
export class FollowListDialogComponent implements OnInit {
  private readonly followsService = inject(FollowsService);

  readonly userId = input.required<string>();
  readonly initialMode = input<FollowListMode>('followers');
  readonly closed = output<void>();

  readonly pageSize = 8;
  readonly users = signal<FollowUser[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);

  mode: FollowListMode = 'followers';

  readonly modeOptions = [
    { label: 'Followers', value: 'followers' },
    { label: 'Following', value: 'following' },
  ];

  ngOnInit(): void {
    this.mode = this.initialMode();
    this.load(1);
  }

  load(page = 1): void {
    this.loading.set(true);
    this.followsService
      .getList(this.userId(), this.mode, page, this.pageSize)
      .subscribe({
        next: (res) => {
          this.users.set(res.data);
          this.total.set(res.total);
          this.page.set(res.page);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onPageChange(event: PaginatorState): void {
    this.load((event.page ?? 0) + 1);
  }

  initials(u: FollowUser): string {
    return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase();
  }
}
