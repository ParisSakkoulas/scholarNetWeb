import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Column, CreateColumnPayload } from '../models/column.model';
import { environment } from '../../../../environmets/environment';

@Injectable({ providedIn: 'root' })
export class ColumnsService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getForBoard(boardId: string) {
    return this.http.get<Column[]>(`${this.base}/boards/${boardId}/columns`);
  }

  create(boardId: string, payload: CreateColumnPayload) {
    return this.http.post<Column>(
      `${this.base}/boards/${boardId}/columns`,
      payload,
    );
  }

  update(columnId: string, payload: CreateColumnPayload) {
    return this.http.patch<Column>(`${this.base}/columns/${columnId}`, payload);
  }

  remove(columnId: string) {
    return this.http.delete<{ deleted: boolean }>(
      `${this.base}/columns/${columnId}`,
    );
  }
}
