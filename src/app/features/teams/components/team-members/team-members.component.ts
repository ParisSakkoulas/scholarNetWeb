import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import {
  AutoCompleteCompleteEvent,
  AutoCompleteModule,
} from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Select } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import { AuthService } from '../../../../core/services/auth.service';
import { UserService } from '../../../../core/services/user.service';
import { TeamMember, TeamRole } from '../../models/team-member.model';
import { UserSearchResult } from '../../models/user-search.model';
import { TeamMembersService } from '../../services/team-members.service';
import { RoleBadgeComponent } from '../shared/role-badge/role-badge.component';

/** A search hit, marked when that user can't be invited again. */
interface InviteCandidate extends UserSearchResult {
  fullName: string;
  /** set when the user is already on the team / has a pending invite */
  blockedReason: string | null;
}

@Component({
  selector: 'app-team-members',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RoleBadgeComponent,
    AutoCompleteModule,
    AvatarModule,
    ButtonModule,
    ConfirmDialogModule,
    Select,
    SkeletonModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './team-members.component.html',
  styleUrl: './team-members.component.css',
})
export class TeamMembersComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly membersService = inject(TeamMembersService);
  private readonly usersService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);

  teamId!: string;

  readonly members = signal<TeamMember[]>([]);
  readonly loading = signal(true);

  // invite box
  selectedInvitee: InviteCandidate | null = null;
  inviteRole: Exclude<TeamRole, 'owner'> = 'member';
  readonly suggestions = signal<InviteCandidate[]>([]);
  readonly searching = signal(false);
  readonly inviting = signal(false);

  readonly inviteRoleOptions = [
    { label: 'Member', value: 'member' },
    { label: 'Admin', value: 'admin' },
    { label: 'Viewer', value: 'viewer' },
  ];

  /** Owner is excluded: that role isn't assignable through this UI. */
  readonly memberRoleOptions = this.inviteRoleOptions;

  // ---------------- derived state ----------------

  readonly activeMembers = computed(() =>
    this.members().filter((m) => m.status === 'active'),
  );
  readonly pendingInvites = computed(() =>
    this.members().filter((m) => m.status === 'invited'),
  );

  private readonly myId = computed(() => this.authService.currentUser()?.id);

  /** Asked from the API, so it doesn't depend on matching user ids on the client. */
  readonly myRole = signal<TeamRole | null>(null);

  /** only owners and admins can invite, change roles and remove people */
  readonly canManage = computed(
    () => this.myRole() === 'owner' || this.myRole() === 'admin',
  );
  readonly canLeave = computed(() => !!this.myRole() && this.myRole() !== 'owner');

  ngOnInit(): void {
    this.teamId = this.route.snapshot.paramMap.get('teamId')!;
    this.fetchMembers();
    this.membersService.myRole(this.teamId).subscribe({
      next: ({ role }) => this.myRole.set(role),
    });
  }

  fetchMembers(): void {
    this.loading.set(true);
    this.membersService.list(this.teamId).subscribe({
      next: (members) => {
        this.members.set(members);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastError('Could not load members');
      },
    });
  }

  // ---------------- invite ----------------

  /** p-autocomplete completeMethod, already debounced by its `delay`. */
  searchUsers(event: AutoCompleteCompleteEvent): void {
    const query = event.query.trim();
    if (query.length < 2) {
      this.suggestions.set([]);
      return;
    }

    this.searching.set(true);
    this.usersService.search(query).subscribe({
      next: (results) => {
        this.suggestions.set(results.map((u) => this.toCandidate(u)));
        this.searching.set(false);
      },
      error: () => {
        this.suggestions.set([]);
        this.searching.set(false);
        this.toastError('Search failed', 'Please try again.');
      },
    });
  }

  private toCandidate(user: UserSearchResult): InviteCandidate {
    const existing = this.members().find((m) => this.memberUserId(m) === user._id);
    const fullName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username;
    return {
      ...user,
      fullName,
      blockedReason: !existing
        ? null
        : existing.status === 'invited'
          ? 'Invite pending'
          : 'Already a member',
    };
  }

  invite(): void {
    const invitee = this.selectedInvitee;
    if (!invitee || invitee.blockedReason || this.inviting()) return;

    this.inviting.set(true);
    this.membersService
      .invite(this.teamId, { userId: invitee._id, role: this.inviteRole })
      .subscribe({
        next: (member) => {
          this.inviting.set(false);
          // a re-invite reuses the row, so replace instead of adding twice
          this.members.update((list) => [
            ...list.filter((m) => this.memberUserId(m) !== invitee._id),
            member,
          ]);
          this.selectedInvitee = null;
          this.messages.add({
            severity: 'success',
            summary: 'Invitation sent',
            detail: `${invitee.fullName} was invited as ${this.inviteRole}.`,
          });
        },
        error: (err) => {
          this.inviting.set(false);
          this.toastError('Could not invite', err?.error?.message);
        },
      });
  }

  // ---------------- manage members ----------------

  changeRole(member: TeamMember, role: string): void {
    this.membersService
      .updateRole(this.teamId, this.memberUserId(member), {
        role: role as Exclude<TeamRole, 'owner'>,
      })
      .subscribe({
        next: (updated) => {
          this.members.update((list) =>
            list.map((m) => (m._id === member._id ? updated : m)),
          );
          this.messages.add({
            severity: 'success',
            summary: 'Role updated',
            detail: `${this.memberName(member)} is now ${role}.`,
          });
        },
        error: (err) => {
          this.toastError('Could not change role', err?.error?.message);
          this.fetchMembers(); // put the select back to the real value
        },
      });
  }

  cancelInvite(member: TeamMember): void {
    this.removeMember(member, 'Invitation cancelled');
  }

  confirmRemove(member: TeamMember): void {
    this.confirmation.confirm({
      header: 'Remove member',
      message: `Remove ${this.memberName(member)} from the team?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Remove', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', text: true },
      accept: () => this.removeMember(member, 'Member removed'),
    });
  }

  private removeMember(member: TeamMember, summary: string): void {
    this.membersService
      .remove(this.teamId, this.memberUserId(member))
      .subscribe({
        next: () => {
          this.members.update((list) => list.filter((m) => m._id !== member._id));
          this.messages.add({
            severity: 'success',
            summary,
            detail: this.memberName(member),
          });
        },
        error: (err) => this.toastError('Could not remove', err?.error?.message),
      });
  }

  confirmLeave(): void {
    this.confirmation.confirm({
      header: 'Leave team',
      message: 'Are you sure you want to leave this team?',
      icon: 'pi pi-sign-out',
      acceptButtonProps: { label: 'Leave', severity: 'danger' },
      rejectButtonProps: { label: 'Stay', severity: 'secondary', text: true },
      accept: () =>
        this.membersService.leave(this.teamId).subscribe({
          next: () => this.router.navigate(['/main/teams']),
          error: (err) => this.toastError('Could not leave', err?.error?.message),
        }),
    });
  }

  // ---------------- helpers for the template ----------------

  isMe(member: TeamMember): boolean {
    return this.memberUserId(member) === this.myId();
  }

  memberUserId(member: TeamMember): string {
    return typeof member.userId === 'string' ? member.userId : member.userId._id;
  }

  memberName(member: TeamMember): string {
    if (typeof member.userId === 'string') return member.userId;
    const u = member.userId;
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username;
  }

  memberUsername(member: TeamMember): string | null {
    return typeof member.userId === 'string' ? null : member.userId.username;
  }

  memberEmail(member: TeamMember): string | null {
    return typeof member.userId === 'string' ? null : member.userId.email;
  }

  memberPhoto(member: TeamMember): string | undefined {
    return typeof member.userId === 'string'
      ? undefined
      : member.userId.profilePhotoUrl;
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  private toastError(summary: string, detail?: string): void {
    this.messages.add({
      severity: 'error',
      summary,
      detail: detail ?? 'Something went wrong',
    });
  }
}
