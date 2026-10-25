import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environmets/environment';
import {
  AppNotification,
  NotificationPage,
  NotificationType,
} from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/notifications`;

  /** Number on the bell badge, shared by the header and the notifications page. */
  private readonly _unreadCount = signal(0);
  readonly unreadCount = this._unreadCount.asReadonly();

  list(options: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    type?: NotificationType | null;
  }): Observable<NotificationPage> {
    let params = new HttpParams()
      .set('page', options.page ?? 1)
      .set('limit', options.limit ?? 20);
    if (options.unreadOnly) params = params.set('unread', 'true');
    if (options.type) params = params.set('type', options.type);
    return this.http.get<NotificationPage>(this.api, { params });
  }

  /** Refreshes the bell badge. */
  refreshUnreadCount(): void {
    this.http
      .get<{ count: number }>(`${this.api}/unread-count`)
      .subscribe({ next: (res) => this._unreadCount.set(res.count) });
  }

  resetUnreadCount(): void {
    this._unreadCount.set(0);
  }

  markRead(id: string): Observable<AppNotification> {
    return this.http
      .patch<AppNotification>(`${this.api}/${id}/read`, {})
      .pipe(tap(() => this.refreshUnreadCount()));
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.http
      .patch<{ updated: number }>(`${this.api}/read-all`, {})
      .pipe(tap(() => this._unreadCount.set(0)));
  }

  remove(id: string): Observable<{ deleted: true }> {
    return this.http
      .delete<{ deleted: true }>(`${this.api}/${id}`)
      .pipe(tap(() => this.refreshUnreadCount()));
  }

  /** Clears every notification, or only the read ones. */
  clear(onlyRead = false): Observable<{ deleted: number }> {
    const params = onlyRead ? new HttpParams().set('onlyRead', 'true') : undefined;
    return this.http
      .delete<{ deleted: number }>(this.api, { params })
      .pipe(tap(() => this.refreshUnreadCount()));
  }

  /** Where clicking a notification should go; null when there is no target. */
  routeFor(n: AppNotification): string[] | null {
    // an invite is answered from the teams list, the invited user is not a member yet
    if (n.type === 'TEAM_INVITE') return ['/main/teams'];
    // the uploader answers access requests from the inbox
    if (n.type === 'FILE_ACCESS_REQUEST') return ['/main/requests/files'];
    // an authorship invite is answered from the inbox too
    if (n.type === 'PUBLICATION_AUTHOR_INVITE') return ['/main/requests/authorship'];
    if (n.type === 'TEAM_INVITE_ACCEPTED' && n.entityId) {
      return ['/main/teams', n.entityId, 'members'];
    }
    if (n.type.startsWith('DOCUMENT_') && n.entityId && n.data?.['mode'] === 'editor') {
      return ['/main/supervision', n.entityId, 'workspace'];
    }
    if (n.type.startsWith('DOCUMENT_') && n.entityId && n.data?.['documentId']) {
      return ['/main/supervision', n.entityId, 'documents', String(n.data['documentId'])];
    }
    // an invitation is answered from the supervisor dashboard
    if (n.type === 'SUPERVISION_INVITE') return ['/main/supervision/students'];
    if (n.type === 'MEETING_REMINDER' && n.entityId && n.data?.['meetingId']) {
      return ['/main/supervision', n.entityId, 'meetings', String(n.data['meetingId'])];
    }
    if (n.entityType === 'supervision' && n.entityId) {
      return ['/main/supervision', n.entityId];
    }
    if (n.entityType === 'post' && n.entityId) {
      return ['/main/posts', n.entityId];
    }
    if (n.entityType === 'publication' && n.entityId) {
      return ['/main/publications', n.entityId];
    }
    if (n.entityType === 'user' && n.entityId) {
      return ['/main/profile', n.entityId];
    }
    if (n.entityType === 'team' && n.entityId) {
      return ['/main/teams', n.entityId];
    }
    if (n.entityType === 'project' && n.entityId) {
      return ['/main/projects', n.entityId];
    }
    return null;
  }
}
