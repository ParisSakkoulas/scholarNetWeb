import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssigneeOption, Task } from '../../models/task.model';
import { PriorityBadgeComponent } from '../shared/priority-badge/priority-badge.component';
import {
  UserAvatarGroupComponent,
  AvatarUser,
} from '../shared/user-avatar-group/user-avatar-group.component';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [
    CommonModule,
    PriorityBadgeComponent,
    UserAvatarGroupComponent,
    ButtonModule,
  ],
  templateUrl: './task-card.component.html',
})
export class TaskCardComponent {
  @Input({ required: true }) task!: Task;
  @Input() assignees: AssigneeOption[] = [];
  /** Approved task seen by a non-manager: view only. */
  @Input() locked = false;
  @Output() edit = new EventEmitter<Task>();
  @Output() deleteTask = new EventEmitter<Task>();

  get assigneeUsers(): AvatarUser[] {
    return (this.task.assigneeIds as any[]).map((a) => {
      if (typeof a !== 'string') return a;
      const known = this.assignees.find((o) => o._id === a);
      return { _id: a, name: known?.name ?? a, avatarUrl: known?.avatarUrl };
    });
  }

  get isOverdue(): boolean {
    return (
      !!this.task.dueDate &&
      new Date(this.task.dueDate) < new Date() &&
      this.task.status !== 'done'
    );
  }

  onEditClick(event: Event): void {
    event.stopPropagation();
    this.edit.emit(this.task);
  }

  onDeleteClick(event: Event): void {
    event.stopPropagation();
    this.deleteTask.emit(this.task);
  }
}
