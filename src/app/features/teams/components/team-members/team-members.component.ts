import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RoleBadgeComponent } from '../shared/role-badge/role-badge.component';
import { TeamMember, TeamRole } from '../../models/team-member.model';
import { ActivatedRoute } from '@angular/router';
import { TeamMembersService } from '../../services/team-members.service';

@Component({
  selector: 'app-team-members',
  imports: [CommonModule, FormsModule, RoleBadgeComponent],
  templateUrl: './team-members.component.html',
  styleUrl: './team-members.component.css',
})
export class TeamMembersComponent {
  members = signal<TeamMember[]>([]);
  loading = signal(true);
  inviteUserId = signal('');
  inviteRole = signal<TeamRole>('member');
  error = signal<string | null>(null);

  teamId!: string;

  private route = inject(ActivatedRoute);
  private membersService = inject(TeamMembersService);

  ngOnInit(): void {
    this.teamId = this.route.snapshot.paramMap.get('teamId')!;
    this.fetchMembers();
  }

  fetchMembers(): void {
    this.loading.set(true);
    this.membersService.list(this.teamId).subscribe({
      next: (members) => {
        this.members.set(members);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  invite(): void {
    if (!this.inviteUserId().trim()) return;
    this.error.set(null);
    this.membersService
      .invite(this.teamId, {
        userId: this.inviteUserId(),
        role: this.inviteRole() as any,
      })
      .subscribe({
        next: (member) => {
          this.members.update((list) => [...list, member]);
          this.inviteUserId.set('');
        },
        error: (err) =>
          this.error.set(err?.error?.message ?? 'Could not invite user'),
      });
  }

  changeRole(userId: string, role: string): void {
    this.membersService
      .updateRole(this.teamId, userId, { role: role as any })
      .subscribe((updated) => {
        this.members.update((list) =>
          list.map((m) => (this.memberUserId(m) === userId ? updated : m)),
        );
      });
  }

  remove(userId: string): void {
    this.membersService.remove(this.teamId, userId).subscribe(() => {
      this.members.update((list) =>
        list.filter((m) => this.memberUserId(m) !== userId),
      );
    });
  }

  memberUserId(member: TeamMember): string {
    return typeof member.userId === 'string'
      ? member.userId
      : member.userId._id;
  }

  memberName(member: TeamMember): string {
    return typeof member.userId === 'string'
      ? member.userId
      : member.userId.name;
  }
}
