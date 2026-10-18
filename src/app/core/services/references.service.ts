import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environmets/environment';
import {
  CitedWork,
  PublicationReference,
  ReferenceImport,
  ReferenceInput,
  ReferencePage,
  SyncResult,
} from '../models/reference.model';

/** Reference list of one publication. Writes are uploader-only on the API. */
@Injectable({ providedIn: 'root' })
export class ReferencesService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/publications`;

  list(publicationId: string, page = 1, limit = 200): Observable<ReferencePage<PublicationReference>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<ReferencePage<PublicationReference>>(
      `${this.api}/${publicationId}/references`,
      { params },
    );
  }

  /** scholarNet publications that cite this one. */
  citedBy(publicationId: string, page = 1, limit = 20): Observable<ReferencePage<CitedWork>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<ReferencePage<CitedWork>>(
      `${this.api}/${publicationId}/cited-by`,
      { params },
    );
  }

  add(publicationId: string, input: ReferenceInput): Observable<PublicationReference> {
    return this.http.post<PublicationReference>(`${this.api}/${publicationId}/references`, input);
  }

  /** `citedPublicationId` cannot be changed here, only the metadata. */
  update(
    publicationId: string,
    refId: string,
    input: Omit<ReferenceInput, 'citedPublicationId'>,
  ): Observable<PublicationReference> {
    return this.http.patch<PublicationReference>(
      `${this.api}/${publicationId}/references/${refId}`,
      input,
    );
  }

  remove(publicationId: string, refId: string): Observable<{ deleted: true }> {
    return this.http.delete<{ deleted: true }>(`${this.api}/${publicationId}/references/${refId}`);
  }

  importReferences(
    publicationId: string,
    body: ReferenceImport,
  ): Observable<{ found: number; added: number }> {
    return this.http.post<{ found: number; added: number }>(
      `${this.api}/${publicationId}/references/import`,
      body,
    );
  }

  /** Pulls missing references from OpenAlex (needs a DOI or OpenAlex id on the publication). */
  sync(publicationId: string): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.api}/${publicationId}/references/sync`, {});
  }
}
