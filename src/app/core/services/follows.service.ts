import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environmets/environment';
import {
  FollowCounts,
  FollowListMode,
  FollowStatus,
  FollowUser,
  PagedResult,
} from '../models/follow.model';

@Injectable({ providedIn: 'root' })
export class FollowsService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/follows`;

  follow(userId: string): Observable<{ following: true }> {
    return this.http.post<{ following: true }>(`${this.api}/${userId}`, {});
  }

  unfollow(userId: string): Observable<{ following: false }> {
    return this.http.delete<{ following: false }>(`${this.api}/${userId}`);
  }

  /** Does the signed-in user follow :userId, and the other way round. */
  getStatus(userId: string): Observable<FollowStatus> {
    return this.http.get<FollowStatus>(`${this.api}/${userId}/status`);
  }

  getCounts(userId: string): Observable<FollowCounts> {
    return this.http.get<FollowCounts>(`${this.api}/${userId}/counts`);
  }

  getList(
    userId: string,
    mode: FollowListMode,
    page = 1,
    limit = 10,
  ): Observable<PagedResult<FollowUser>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PagedResult<FollowUser>>(
      `${this.api}/${userId}/${mode}`,
      { params },
    );
  }
}
