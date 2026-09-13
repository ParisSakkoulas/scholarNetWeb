import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  Task,
  CreateTaskPayload,
  UpdateTaskPayload,
  MoveTaskPayload,
  TaskFilters,
} from '../models/task.model';
import { environment } from '../../../../environmets/environment';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getForProject(projectId: string, filters: TaskFilters = {}) {
    let params = new HttpParams();
    if (filters.columnId) params = params.set('columnId', filters.columnId);
    if (filters.assignee) params = params.set('assignee', filters.assignee);
    if (filters.status) params = params.set('status', filters.status);
    return this.http.get<Task[]>(`${this.base}/projects/${projectId}/tasks`, {
      params,
    });
  }

  getSubtasks(taskId: string) {
    return this.http.get<Task[]>(`${this.base}/tasks/${taskId}/subtasks`);
  }

  create(projectId: string, payload: CreateTaskPayload) {
    return this.http.post<Task>(
      `${this.base}/projects/${projectId}/tasks`,
      payload,
    );
  }

  update(taskId: string, payload: UpdateTaskPayload) {
    return this.http.patch<Task>(`${this.base}/tasks/${taskId}`, payload);
  }

  move(taskId: string, payload: MoveTaskPayload) {
    return this.http.patch<Task>(`${this.base}/tasks/${taskId}/move`, payload);
  }

  remove(taskId: string) {
    return this.http.delete<{ deleted: boolean }>(
      `${this.base}/tasks/${taskId}`,
    );
  }
}
