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
import { Task, TaskPriority, TaskStatus } from '../../models/task.model';
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
  ],
  templateUrl: './task-detail-modal.component.html',
  styleUrl: './task-detail-modal.component.css',
})
export class TaskDetailModalComponent implements OnInit {
  @Input({ required: true }) task!: Task;
  @Output() closed = new EventEmitter<void>();
  @Output() taskUpdated = new EventEmitter<Task>();

  visible = signal(true);

  editableTitle = signal('');
  editableDescription = signal('');
  editablePriority = signal<TaskPriority>('medium');
  editableStatus = signal<TaskStatus>('todo');
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
    this.loadSubtasks();
  }

  save(): void {
    this.saving.set(true);
    this.tasksService
      .update(this.task._id, {
        title: this.editableTitle(),
        description: this.editableDescription(),
        priority: this.editablePriority(),
        status: this.editableStatus(),
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.taskUpdated.emit(updated);
        },
        error: () => this.saving.set(false),
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
