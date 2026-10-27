import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TasksService } from '../../services/tasks.service';
import {
  AssigneeOption,
  Task,
  TaskPriority,
  TaskStatus,
} from '../../models/task.model';
import { MultiSelectModule } from 'primeng/multiselect';
import { CommentThreadComponent } from '../comment-thread/comment-thread.component';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'app-task-detail-modal',
  imports: [
    CommonModule,
    FormsModule,
    CommentThreadComponent,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ButtonModule,
    CheckboxModule,
    MultiSelectModule,
  ],
  templateUrl: './task-detail-modal.component.html',
  styleUrl: './task-detail-modal.component.css',
})
export class TaskDetailModalComponent implements OnInit {
  @Input({ required: true }) task!: Task;
  @Input() assignees: AssigneeOption[] = [];
  /** Owners and admins assign tasks and approve completed ones. */
  @Input() canManage = false;
  @Input() currentUserId: string | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() taskUpdated = new EventEmitter<Task>();

  visible = signal(true);

  editableTitle = signal('');
  editableDescription = signal('');
  editablePriority = signal<TaskPriority>('medium');
  editableStatus = signal<TaskStatus>('todo');
  editableAssignees = signal<string[]>([]);
  approving = signal(false);
  error = signal<string | null>(null);
  saving = signal(false);
  subtasks = signal<Task[]>([]);
  newSubtaskTitle = signal('');
  addingSubtask = signal(false);

  priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
  ];

  statusOptions = [
    { label: 'To Do', value: 'todo' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Done', value: 'done' },
    { label: 'Blocked', value: 'blocked' },
  ];

  constructor(private tasksService: TasksService) {}

  ngOnInit(): void {
    this.editableTitle.set(this.task.title);
    this.editableDescription.set(this.task.description ?? '');
    this.editablePriority.set(this.task.priority);
    this.editableStatus.set(this.task.status);
    this.editableAssignees.set(this.assigneeIdsOf(this.task));
    this.loadSubtasks();
  }

  private assigneeIdsOf(task: Task): string[] {
    return (task.assigneeIds as any[]).map((a) => (typeof a === 'string' ? a : a._id));
  }

  /** Managers can set any status; everyone else only on tasks assigned to them. */
  get canChangeStatus(): boolean {
    return (
      this.canManage ||
      (!!this.currentUserId && this.assigneeIdsOf(this.task).includes(this.currentUserId))
    );
  }

  assigneeName(id: string): string {
    return this.assignees.find((a) => a._id === id)?.name ?? id;
  }

  /** Approved tasks are read-only for everyone except admins and owners. */
  get locked(): boolean {
    return this.isApproved && !this.canManage;
  }

  get isApproved(): boolean {
    return !!this.task.approvedAt;
  }

  /** Approval is only offered once the task is actually done (as saved, not as being edited). */
  get canApprove(): boolean {
    return this.canManage && this.task.status === 'done';
  }

  toggleApproval(): void {
    this.approving.set(true);
    this.error.set(null);
    const request$ = this.isApproved
      ? this.tasksService.unapprove(this.task._id)
      : this.tasksService.approve(this.task._id);
    request$.subscribe({
      next: (updated) => {
        this.approving.set(false);
        this.taskUpdated.emit(updated);
      },
      error: (err) => {
        this.approving.set(false);
        this.error.set(err?.error?.message ?? 'Could not update approval');
      },
    });
  }

  save(): void {
    this.saving.set(true);
    this.error.set(null);
    this.tasksService
      .update(this.task._id, {
        title: this.editableTitle(),
        description: this.editableDescription(),
        priority: this.editablePriority(),
        status: this.editableStatus(),
        ...(this.canManage ? { assigneeIds: this.editableAssignees() } : {}),
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.taskUpdated.emit(updated);
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err?.error?.message ?? 'Could not save the task');
        },
      });
  }

  onVisibleChange(value: boolean): void {
    this.visible.set(value);
    if (!value) {
      this.closed.emit();
    }
  }

  loadSubtasks(): void {
    this.tasksService
      .getSubtasks(this.task._id)
      .subscribe((subs) => this.subtasks.set(subs));
  }

  addSubtask(): void {
    if (!this.newSubtaskTitle().trim()) return;
    this.tasksService
      .create(this.task.projectId, {
        title: this.newSubtaskTitle(),
        columnId: this.task.columnId,
        parentTaskId: this.task._id,
      })
      .subscribe((sub) => {
        this.subtasks.update((list) => [...list, sub]);
        this.newSubtaskTitle.set('');
        this.addingSubtask.set(false);
      });
  }

  get doneSubtasksCount(): number {
    return this.subtasks().filter((s) => s.status === 'done').length;
  }

  toggleSubtaskDone(subtask: Task): void {
    const newStatus = subtask.status === 'done' ? 'todo' : 'done';
    this.tasksService
      .update(subtask._id, { status: newStatus })
      .subscribe((updated) => {
        this.subtasks.update((list) =>
          list.map((s) => (s._id === updated._id ? updated : s)),
        );
      });
  }

  removeSubtask(subtaskId: string): void {
    this.tasksService.remove(subtaskId).subscribe(() => {
      this.subtasks.update((list) => list.filter((s) => s._id !== subtaskId));
    });
  }
}
