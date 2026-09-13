import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AvatarUser {
  _id: string;
  name: string;
  avatarUrl?: string;
}

@Component({
  selector: 'app-user-avatar-group',
  imports: [CommonModule],
  templateUrl: './user-avatar-group.component.html',
  styleUrl: './user-avatar-group.component.css',
})
export class UserAvatarGroupComponent {
  @Input({ required: true }) set users(value: AvatarUser[]) {
    this._users.set(value ?? []);
  }
  @Input() max = 3;

  private _users = signal<AvatarUser[]>([]);

  readonly visible = computed(() => this._users().slice(0, this.max));
  readonly overflowCount = computed(() =>
    Math.max(0, this._users().length - this.max),
  );

  initials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
