import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Comment, CreateCommentPayload } from '../models/comment.model';
import { environment } from '../../../../environmets/environment';

@Injectable({ providedIn: 'root' })
export class CommentsService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getForTask(taskId: string) {
    return this.http.get<Comment[]>(`${this.base}/tasks/${taskId}/comments`);
  }

  create(taskId: string, payload: CreateCommentPayload) {
    return this.http.post<Comment>(
      `${this.base}/tasks/${taskId}/comments`,
      payload,
    );
  }

  remove(commentId: string) {
    return this.http.delete<{ deleted: boolean }>(
      `${this.base}/tasks/comments/${commentId}`,
    );
  }
}
