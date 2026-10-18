import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environmets/environment';
import {
  Publication,
  PublicationPage,
  PublicationPayload,
  PublicationType,
} from '../models/publication.model';

export interface PublicationFilters {
  page?: number;
  limit?: number;
  q?: string;
  type?: PublicationType | null;
  yearFrom?: number | null;
  yearTo?: number | null;
}

@Injectable({ providedIn: 'root' })
export class PublicationsService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/publications`;

  /** Everything the signed-in user is allowed to see. */
  search(filters: PublicationFilters): Observable<PublicationPage> {
    return this.http.get<PublicationPage>(this.api, { params: this.params(filters) });
  }

  /** My own publications, private ones included. */
  mine(filters: PublicationFilters): Observable<PublicationPage> {
    return this.http.get<PublicationPage>(`${this.api}/me`, {
      params: this.params(filters),
    });
  }

  byUser(userId: string, filters: PublicationFilters): Observable<PublicationPage> {
    return this.http.get<PublicationPage>(`${this.api}/user/${userId}`, {
      params: this.params(filters),
    });
  }

  get(id: string): Observable<Publication> {
    return this.http.get<Publication>(`${this.api}/${id}`);
  }

  create(payload: PublicationPayload): Observable<Publication> {
    return this.http.post<Publication>(this.api, payload);
  }

  update(id: string, payload: PublicationPayload): Observable<Publication> {
    return this.http.patch<Publication>(`${this.api}/${id}`, payload);
  }

  remove(id: string): Observable<{ deleted: true }> {
    return this.http.delete<{ deleted: true }>(`${this.api}/${id}`);
  }

  private params(f: PublicationFilters): HttpParams {
    let params = new HttpParams()
      .set('page', f.page ?? 1)
      .set('limit', f.limit ?? 10);
    if (f.q) params = params.set('q', f.q);
    if (f.type) params = params.set('type', f.type);
    if (f.yearFrom) params = params.set('yearFrom', f.yearFrom);
    if (f.yearTo) params = params.set('yearTo', f.yearTo);
    return params;
  }
}
