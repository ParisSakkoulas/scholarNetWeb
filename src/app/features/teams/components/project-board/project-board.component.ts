import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { TaskCardComponent } from '../task-card/task-card.component';

import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Column } from '../../models/column.model';
import { ProjectWithBoards } from '../../models/project.model';
import { Task } from '../../models/task.model';
import { ActivatedRoute } from '@angular/router';
import { ProjectsService } from '../../services/projects.service';
import { TasksService } from '../../services/tasks.service';
import { TaskFormComponent } from '../task-form/task-form.component';
import { TaskDetailModalComponent } from '../task-detail-modal/task-detail-modal.component';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { PriorityBadgeComponent } from '../shared/priority-badge/priority-badge.component';
import { UserAvatarGroupComponent } from '../shared/user-avatar-group/user-avatar-group.component';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  selector: 'app-project-board',
  imports: [
    CommonModule,
    DragDropModule,
    TaskCardComponent,
    TaskFormComponent,
    TaskDetailModalComponent,
    PriorityBadgeComponent,
    UserAvatarGroupComponent,
    ButtonModule,
    ConfirmDialogModule,
  ],

  templateUrl: './project-board.component.html',
  styleUrl: './project-board.component.css',
  providers: [ConfirmationService],
})
export class ProjectBoardComponent implements OnInit {
  project = signal<ProjectWithBoards | null>(null);
  tasksByColumn = signal<Record<string, Task[]>>({});
  loading = signal(true);

  addingToColumn = signal<string | null>(null);
  selectedTask = signal<Task | null>(null);

  projectId!: string;

  columns = computed<Column[]>(() => {
    const p = this.project();
    return p?.boards?.[0]?.columns ?? [];
  });

  private route = inject(ActivatedRoute);
  private projectsService = inject(ProjectsService);
  private tasksService = inject(TasksService);
  private confirmationService = inject(ConfirmationService);

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId')!;
    this.loadBoard();
  }

  loadBoard(): void {
    this.loading.set(true);
    this.projectsService.getOne(this.projectId).subscribe((project) => {
      this.project.set(project);
      this.loadTasks();
    });
  }

  loadTasks(): void {
    this.tasksService.getForProject(this.projectId).subscribe((tasks) => {
      const grouped: Record<string, Task[]> = {};
      for (const col of this.columns()) grouped[col._id] = [];
      for (const task of tasks) {
        (grouped[task.columnId] ??= []).push(task);
      }
      for (const key in grouped) {
        grouped[key].sort((a, b) => a.position - b.position);
      }
      this.tasksByColumn.set(grouped);
      this.loading.set(false);
    });
  }

  tasksFor(columnId: string): Task[] {
    return this.tasksByColumn()[columnId] ?? [];
  }

  connectedLists(): string[] {
    return this.columns().map((c) => c._id);
  }

  onTaskCreated(task: Task): void {
    this.tasksByColumn.update((grouped) => ({
      ...grouped,
      [task.columnId]: [...(grouped[task.columnId] ?? []), task],
    }));
    this.addingToColumn.set(null);
  }

  openTask(task: Task): void {
    this.selectedTask.set(task);
  }

  onTaskUpdated(updated: Task): void {
    this.loadTasks();
    this.selectedTask.set(null);
  }

  onDrop(event: CdkDragDrop<Task[]>, columnId: string): void {
    const grouped = { ...this.tasksByColumn() };

    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }

    this.tasksByColumn.set(grouped);

    const movedTask = event.container.data[event.currentIndex];
    const siblings = event.container.data;
    const prev = siblings[event.currentIndex - 1]?.position ?? 0;
    const next = siblings[event.currentIndex + 1]?.position ?? prev + 2000;
    const newPosition = (prev + next) / 2;

    this.tasksService
      .move(movedTask._id, { columnId, position: newPosition })
      .subscribe((updatedTask) => {
        // reconcile the server's authoritative version (status, doneAt, position) into local state
        this.tasksByColumn.update((current) => {
          const next = { ...current };
          next[updatedTask.columnId] = (next[updatedTask.columnId] ?? []).map(
            (t) => (t._id === updatedTask._id ? updatedTask : t),
          );
          return next;
        });
      });
  }

  onDeleteTask(task: Task): void {
    this.confirmationService.confirm({
      message: `Delete "${task.title}"? This can't be undone.`,
      header: 'Delete Task',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: 'danger', label: 'Delete' },
      rejectButtonProps: { severity: 'secondary', label: 'Cancel', text: true },
      accept: () => {
        this.tasksService.remove(task._id).subscribe(() => this.loadTasks());
      },
    });
  }
}
