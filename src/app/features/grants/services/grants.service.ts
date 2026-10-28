import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environmets/environment';
import { PageQuery } from '../../../shared/models/page-query';
import {
  GrantCall,
  GrantFilters,
  GrantPayload,
  GrantPreferences,
  GrantSaveState,
  GrantStatus,
  MatchesPage,
  Page,
} from '../models/grant.model';

@Injectable({ providedIn: 'root' })
export class GrantsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/grants`;

  list(filters: GrantFilters = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && String(value).trim() !== '' && value !== false) {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<Page<GrantCall>>(this.base, { params });
  }

  preferences() {
    return this.http.get<GrantPreferences>(`${this.base}/preferences`);
  }

  setPreferences(payload: Omit<GrantPreferences, 'careerStage'> & { careerStage: string | null }) {
    return this.http.put<GrantPreferences>(`${this.base}/preferences`, payload);
  }

  /** "For you": open calls that fit the preferences, best fit first. */
  matches(page: number, pageSize: number) {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<MatchesPage>(`${this.base}/matches`, { params });
  }

  get(id: string) {
    return this.http.get<GrantCall>(`${this.base}/${id}`);
  }

  mySubmissions() {
    return this.http.get<GrantCall[]>(`${this.base}/submissions/mine`);
  }

  submit(payload: GrantPayload) {
    return this.http.post<GrantCall>(`${this.base}/submit`, payload);
  }

  save(id: string) {
    return this.http.post<{ state: GrantSaveState | null }>(`${this.base}/${id}/save`, {});
  }

  dismiss(id: string) {
    return this.http.post<{ state: GrantSaveState | null }>(`${this.base}/${id}/dismiss`, {});
  }

  /** Clears a save or a dismissal. */
  unmark(id: string) {
    return this.http.delete<{ state: GrantSaveState | null }>(`${this.base}/${id}/save`);
  }

  // ---- admin ----

  create(payload: GrantPayload) {
    return this.http.post<GrantCall>(this.base, payload);
  }

  update(id: string, payload: Partial<GrantPayload>) {
    return this.http.patch<GrantCall>(`${this.base}/${id}`, payload);
  }

  remove(id: string) {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/${id}`);
  }

  review(id: string, decision: 'approve' | 'reject', note?: string) {
    return this.http.patch<GrantCall>(`${this.base}/${id}/review`, { decision, ...(note ? { note } : {}) });
  }

  /** Moderator table (the generic table's paging and search, plus a status filter). */
  manage(query: PageQuery, status?: GrantStatus | '') {
    let params = new HttpParams().set('page', query.page).set('pageSize', query.pageSize);
    if (query.sortField) params = params.set('sortField', query.sortField);
    if (query.sortOrder) params = params.set('sortOrder', query.sortOrder);
    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (status) params = params.set('status', status);
    return this.http.get<Page<GrantCall>>(`${this.base}/manage`, { params });
  }
}
