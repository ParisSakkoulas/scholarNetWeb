import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Project } from '../../models/project.model';
import { ProjectsService } from '../../services/projects.service';

import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-project-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    DatePickerModule,
    ButtonModule,
  ],
  templateUrl: './project-form.component.html',
  styleUrl: './project-form.component.css',
})
export class ProjectFormComponent {
  @Input({ required: true }) teamId!: string;
  @Input() project: Project | null = null;
  @Output() created = new EventEmitter<Project>();
  @Output() updated = new EventEmitter<Project>();
  @Output() cancelled = new EventEmitter<void>();

  submitting = signal(false);
  error = signal<string | null>(null);

  private fb = inject(FormBuilder);
  private projectsService = inject(ProjectsService);

  form = this.fb.nonNullable.group({
    name: [
      this.project?.name ?? '',
      [Validators.required, Validators.maxLength(120)],
    ],
    description: [this.project?.description ?? ''],
    dueDate: [this.project?.dueDate ?? ''],
  });

  get isEdit(): boolean {
    return !!this.project;
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);

    const payload = this.form.getRawValue();

    const request$ = this.isEdit
      ? this.projectsService.update(this.project!._id, payload)
      : this.projectsService.create(this.teamId, payload as any);

    request$.subscribe({
      next: (project) => {
        this.submitting.set(false);
        this.isEdit ? this.updated.emit(project) : this.created.emit(project);
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.message ?? 'Something went wrong');
      },
    });
  }
}
