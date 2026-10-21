import { Component, inject, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';

import {
  AccessRequestStatus,
  FileAccessRequest,
} from '../../../core/models/publication-file.model';
import { PublicationFilesService } from '../../../core/services/publication-files.service';
import { timeAgo } from '../../../shared/utils/time-ago';
import { apiMessage } from '../files/file-utils';

type Box = 'incoming' | 'mine';
type StatusFilter = AccessRequestStatus | 'all';

@Component({
  selector: 'app-file-requests',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    AvatarModule,
    ButtonModule,
    PaginatorModule,
    SelectButtonModule,
    SkeletonModule,
    TagModule,
  ],
  templateUrl: './file-requests.component.html',
})
export class FileRequestsComponent {
  /** Hide the page title and spacing when shown inside the requests page. */
  @Input() embedded = false;

  private readonly api = inject(PublicationFilesService);

  readonly timeAgo = timeAgo;
  readonly pageSize = 10;

  readonly box = signal<Box>('incoming');
  readonly status = signal<StatusFilter>('pending');
  readonly items = signal<FileAccessRequest[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);

  readonly boxOptions = [
    { label: 'Received', value: 'incoming' },
    { label: 'Sent', value: 'mine' },
  ];
  readonly statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Declined', value: 'rejected' },
    { label: 'All', value: 'all' },
  ];

  constructor() {
    this.load();
  }

  setBox(box: Box): void {
    this.box.set(box);
    this.page.set(1);
    this.load();
  }

  setStatus(status: StatusFilter): void {
    this.status.set(status);
    this.page.set(1);
    this.load();
  }

  onPage(e: PaginatorState): void {
    this.page.set((e.page ?? 0) + 1);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const request$ =
      this.box() === 'incoming'
        ? this.api.incoming(this.status() === 'all' ? null : this.status() as AccessRequestStatus, this.page(), this.pageSize)
        : this.api.mine(this.page(), this.pageSize);
    request$.subscribe({
      next: (res) => {
        this.items.set(res.data);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiMessage(err, 'Could not load the requests.'));
        this.loading.set(false);
      },
    });
  }

  decide(r: FileAccessRequest, decision: 'approve' | 'reject'): void {
    this.busyId.set(r._id);
    this.api.decide(r._id, decision).subscribe({
      next: (updated) => {
        this.busyId.set(null);
        // keep the row if the current filter still matches, otherwise it leaves the list
        const stays = this.status() === 'all' || this.status() === updated.status;
        this.items.update((list) =>
          stays ? list.map((x) => (x._id === r._id ? { ...x, ...updated, requester: x.requester } : x)) : list.filter((x) => x._id !== r._id),
        );
        if (!stays) this.total.update((n) => Math.max(0, n - 1));
      },
      error: (err) => {
        this.busyId.set(null);
        this.error.set(apiMessage(err));
      },
    });
  }

  withdraw(r: FileAccessRequest): void {
    this.busyId.set(r._id);
    this.api.cancelRequest(r._id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.items.update((list) => list.filter((x) => x._id !== r._id));
        this.total.update((n) => Math.max(0, n - 1));
      },
      error: (err) => {
        this.busyId.set(null);
        this.error.set(apiMessage(err));
      },
    });
  }

  person(r: FileAccessRequest) {
    return this.box() === 'incoming' ? r.requester : r.owner;
  }

  initials(r: FileAccessRequest): string {
    const u = this.person(r);
    return `${u?.firstName?.[0] ?? ''}${u?.lastName?.[0] ?? ''}`.toUpperCase();
  }

  severity(s: AccessRequestStatus): 'warn' | 'success' | 'danger' {
    return s === 'pending' ? 'warn' : s === 'approved' ? 'success' : 'danger';
  }

  label(s: AccessRequestStatus): string {
    return s === 'rejected' ? 'Declined' : s.charAt(0).toUpperCase() + s.slice(1);
  }
}
