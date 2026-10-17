import { Component, inject, OnInit, output, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';

import { TeamInvitation } from '../../models/team-member.model';
import { TeamMembersService } from '../../services/team-members.service';
import { RoleBadgeComponent } from '../shared/role-badge/role-badge.component';

/** Pending team invitations of the signed-in user, with Accept / Decline. */
@Component({
  selector: 'app-team-invitations',
  standalone: true,
  imports: [AvatarModule, ButtonModule, RoleBadgeComponent],
  templateUrl: './team-invitations.component.html',
})
export class TeamInvitationsComponent implements OnInit {
  private readonly membersService = inject(TeamMembersService);
  private readonly messages = inject(MessageService);

  /** emitted after accepting, so the parent can refresh "My teams" */
  readonly accepted = output<string>();

  readonly invitations = signal<TeamInvitation[]>([]);
  /** team ids with a request in flight */
  readonly busy = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.membersService.myInvitations().subscribe({
      next: (list) => this.invitations.set(list),
    });
  }

  inviterName(inv: TeamInvitation): string {
    const by = inv.invitedBy;
    if (!by) return 'Someone';
    return `${by.firstName ?? ''} ${by.lastName ?? ''}`.trim() || by.username;
  }

  isBusy(inv: TeamInvitation): boolean {
    return this.busy().has(inv.teamId._id);
  }

  accept(inv: TeamInvitation): void {
    this.run(inv, this.membersService.acceptInvitation(inv.teamId._id), () => {
      this.messages.add({
        severity: 'success',
        summary: 'Invitation accepted',
        detail: `You joined ${inv.teamId.name}.`,
      });
      this.accepted.emit(inv.teamId._id);
    });
  }

  decline(inv: TeamInvitation): void {
    this.run(inv, this.membersService.declineInvitation(inv.teamId._id), () =>
      this.messages.add({
        severity: 'info',
        summary: 'Invitation declined',
        detail: inv.teamId.name,
      }),
    );
  }

  private run(
    inv: TeamInvitation,
    request$: { subscribe: (o: object) => unknown },
    onDone: () => void,
  ): void {
    const id = inv.teamId._id;
    this.busy.update((s) => new Set(s).add(id));
    request$.subscribe({
      next: () => {
        this.busy.update((s) => {
          const copy = new Set(s);
          copy.delete(id);
          return copy;
        });
        this.invitations.update((list) =>
          list.filter((i) => i.teamId._id !== id),
        );
        onDone();
      },
      error: (err: { error?: { message?: string } }) => {
        this.busy.update((s) => {
          const copy = new Set(s);
          copy.delete(id);
          return copy;
        });
        this.messages.add({
          severity: 'error',
          summary: 'Something went wrong',
          detail: err?.error?.message ?? 'Please try again.',
        });
        // the invite may be gone already (cancelled / answered elsewhere)
        this.ngOnInit();
      },
    });
  }
}
