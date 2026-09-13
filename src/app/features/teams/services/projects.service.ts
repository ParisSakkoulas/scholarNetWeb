import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import {
  Project,
  ProjectWithBoards,
  CreateProjectPayload,
  UpdateProjectPayload,
  ProjectStatus,
} from '../models/project.model';
import { environment } from '../../../../environmets/environment';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getForTeam(teamId: string, status?: ProjectStatus) {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<Project[]>(`${this.base}/teams/${teamId}/projects`, {
      params,
    });
  }

  create(teamId: string, payload: CreateProjectPayload) {
    return this.http.post<Project>(
      `${this.base}/teams/${teamId}/projects`,
      payload,
    );
  }

  getOne(projectId: string) {
    return this.http.get<ProjectWithBoards>(
      `${this.base}/projects/${projectId}`,
    );
  }

  update(projectId: string, payload: UpdateProjectPayload) {
    return this.http.patch<Project>(
      `${this.base}/projects/${projectId}`,
      payload,
    );
  }

  remove(projectId: string) {
    return this.http.delete<{ deleted: boolean }>(
      `${this.base}/projects/${projectId}`,
    );
  }
}
