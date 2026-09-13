import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Board, CreateBoardPayload } from '../models/board.model';
import { environment } from '../../../../environmets/environment';

@Injectable({ providedIn: 'root' })
export class BoardsService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getForProject(projectId: string) {
    return this.http.get<Board[]>(`${this.base}/projects/${projectId}/boards`);
  }

  create(projectId: string, payload: CreateBoardPayload) {
    return this.http.post<Board>(
      `${this.base}/projects/${projectId}/boards`,
      payload,
    );
  }

  update(boardId: string, payload: CreateBoardPayload) {
    return this.http.patch<Board>(`${this.base}/boards/${boardId}`, payload);
  }

  remove(boardId: string) {
    return this.http.delete<{ deleted: boolean }>(
      `${this.base}/boards/${boardId}`,
    );
  }
}
