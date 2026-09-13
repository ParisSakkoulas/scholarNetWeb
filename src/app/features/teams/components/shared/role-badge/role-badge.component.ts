import { CommonModule } from '@angular/common';
import { Component, computed, Input, signal } from '@angular/core';
import { TeamRole } from '../../../models/team-member.model';

@Component({
  selector: 'app-role-badge',
  imports: [CommonModule],
  templateUrl: './role-badge.component.html',
  styleUrl: './role-badge.component.css',
})
export class RoleBadgeComponent {
  @Input({ required: true }) set role(value: TeamRole) {
    this._role.set(value);
  }

  private _role = signal<TeamRole>('member');

  readonly label = computed(() => {
    const map: Record<TeamRole, string> = {
      owner: 'Owner',
      admin: 'Admin',
      member: 'Member',
      viewer: 'Viewer',
    };
    return map[this._role()];
  });

  readonly classes = computed(() => {
    const map: Record<TeamRole, string> = {
      owner: 'bg-purple-100 text-purple-700',
      admin: 'bg-blue-100 text-blue-700',
      member: 'bg-green-100 text-green-700',
      viewer: 'bg-gray-100 text-gray-600',
    };
    return map[this._role()];
  });
}
