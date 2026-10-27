import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environmets/environment';
import {
  Circle,
  CircleFilters,
  CircleMemberRow,
  CirclePayload,
  CircleSession,
  MyCircle,
  Page,
  SessionResult,
} from '../models/circle.model';

/** Dates travel as ISO strings (UTC); components show them in the user's own time zone. */
@Injectable({ providedIn: 'root' })
export class CirclesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/circles`;

  browse(filters: CircleFilters = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<Page<Circle>>(this.base, { params });
  }

  mine() {
    return this.http.get<MyCircle[]>(`${this.base}/mine`);
  }

  get(id: string) {
    return this.http.get<Circle>(`${this.base}/${id}`);
  }

  create(payload: CirclePayload) {
    return this.http.post<Circle>(this.base, payload);
  }

  update(id: string, payload: Partial<CirclePayload>) {
    return this.http.patch<Circle>(`${this.base}/${id}`, payload);
  }

  close(id: string) {
    return this.http.delete<{ closed: boolean }>(`${this.base}/${id}`);
  }

  join(id: string) {
    return this.http.post<CircleMemberRow>(`${this.base}/${id}/join`, {});
  }

  leave(id: string) {
    return this.http.post<{ left: boolean }>(`${this.base}/${id}/leave`, {});
  }

  updateMember(id: string, userId: string, action: 'approve' | 'remove') {
    return this.http.patch<CircleMemberRow>(`${this.base}/${id}/members/${userId}`, { action });
  }

  report(id: string, reason: string) {
    return this.http.post<{ reported: boolean }>(`${this.base}/${id}/report`, { reason });
  }

  sessions(id: string) {
    return this.http.get<CircleSession[]>(`${this.base}/${id}/sessions`);
  }

  session(id: string, sessionId: string) {
    return this.http.get<CircleSession>(`${this.base}/${id}/sessions/${sessionId}`);
  }

  setGoal(id: string, sessionId: string, goal: string) {
    return this.http.post<CircleSession>(`${this.base}/${id}/sessions/${sessionId}/goal`, { goal });
  }

  checkout(id: string, sessionId: string, result: SessionResult, note?: string) {
    return this.http.post<CircleSession>(`${this.base}/${id}/sessions/${sessionId}/checkout`, {
      result,
      ...(note ? { note } : {}),
    });
  }

  updateSession(id: string, sessionId: string, status: 'cancelled' | 'done') {
    return this.http.patch<CircleSession>(`${this.base}/${id}/sessions/${sessionId}`, { status });
  }
}
