import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TasksService } from '../../services/tasks.service';
import { Task } from '../../models/task.model';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    InputTextModule,
    ButtonModule,
  ],
  templateUrl: './task-form.component.html',
})
export class TaskFormComponent {
  @Input({ required: true }) projectId!: string;
  @Input({ required: true }) columnId!: string;
  @Output() created = new EventEmitter<Task>();
  @Output() cancelled = new EventEmitter<void>();

  visible = signal(true);
  submitting = signal(false);
  error = signal<string | null>(null);

  private fb = inject(FormBuilder);
  private tasksService = inject(TasksService);

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);

    this.tasksService
      .create(this.projectId, {
        title: this.form.getRawValue().title,
        columnId: this.columnId,
      })
      .subscribe({
        next: (task) => {
          this.submitting.set(false);
          this.form.reset();
          this.created.emit(task);
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err?.error?.message ?? 'Could not create task');
        },
      });
  }

  onVisibleChange(value: boolean): void {
    this.visible.set(value);
    if (!value) {
      this.cancelled.emit();
    }
  }
}
