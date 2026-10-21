import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environmets/environment';
import {
  AddAuthorPayload,
  ImportAuthorCandidate,
  ImportAuthorWorksPage,
  ImportLookup,
  ImportResult,
  ImportSource,
  Publication,
  PublicationAuthor,
  PublicationPage,
  PublicationPayload,
  PublicationType,
  PublicationVisibility,
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

  /** Step 1 of the DOI import: nothing is saved, it only shows what each source has. */
  lookupDoi(doi: string): Observable<ImportLookup> {
    return this.http.get<ImportLookup>(`${this.api}/import/lookup`, { params: { doi } });
  }

  /** Step 2: the API fetches the chosen source again and creates the publication. */
  importDoi(doi: string, source: ImportSource, visibility?: PublicationVisibility): Observable<ImportResult> {
    return this.http.post<ImportResult>(`${this.api}/import`, {
      doi,
      source,
      ...(visibility && { visibility }),
    });
  }

  /** OpenAlex authors matching a name. */
  searchImportAuthors(name: string): Observable<ImportAuthorCandidate[]> {
    return this.http.get<ImportAuthorCandidate[]>(`${this.api}/import/authors`, { params: { name } });
  }

  /** One page of an author's works that have a DOI. */
  importAuthorWorks(authorId: string, page = 1): Observable<ImportAuthorWorksPage> {
    return this.http.get<ImportAuthorWorksPage>(`${this.api}/import/authors/${authorId}/works`, {
      params: { page },
    });
  }

  remove(id: string): Observable<{ deleted: true }> {
    return this.http.delete<{ deleted: true }>(`${this.api}/${id}`);
  }

  // ---------------- authors ----------------

  addAuthor(id: string, payload: AddAuthorPayload): Observable<{ authors: PublicationAuthor[] }> {
    return this.http.post<{ authors: PublicationAuthor[] }>(`${this.api}/${id}/authors`, payload);
  }

  removeAuthor(id: string, authorId: string): Observable<{ authors: PublicationAuthor[] }> {
    return this.http.delete<{ authors: PublicationAuthor[] }>(`${this.api}/${id}/authors/${authorId}`);
  }

  /** Publications I am listed on but have not answered yet. */
  invitations(page = 1, limit = 10): Observable<PublicationPage> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PublicationPage>(`${this.api}/authors/invitations`, { params });
  }

  respondToAuthorship(id: string, accept: boolean): Observable<{ authors: PublicationAuthor[] }> {
    return this.http.post<{ authors: PublicationAuthor[] }>(
      `${this.api}/${id}/authors/me/${accept ? 'accept' : 'decline'}`,
      {},
    );
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
