import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../models/task.model';
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
  @Output() edit = new EventEmitter<Task>();
  @Output() deleteTask = new EventEmitter<Task>();

  get assigneeUsers(): AvatarUser[] {
    return (this.task.assigneeIds as any[]).map((a) =>
      typeof a === 'string' ? { _id: a, name: a } : a,
    );
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
