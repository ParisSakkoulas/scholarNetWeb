import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environmets/environment';
import { Snippet, SnippetPayload } from '../models/snippet.model';

@Injectable({ providedIn: 'root' })
export class SnippetsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/snippets`;

  /** My personal snippets and those of my teams. `scope`: 'personal', 'team' (all my teams) or one team's id. */
  list(filters: { type?: string; scope?: string; search?: string } = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value && value.trim()) params = params.set(key, value);
    }
    return this.http.get<Snippet[]>(this.base, { params });
  }

  create(payload: SnippetPayload) {
    return this.http.post<Snippet>(this.base, payload);
  }

  update(id: string, payload: Partial<Pick<SnippetPayload, 'type' | 'title' | 'content'>>) {
    return this.http.patch<Snippet>(`${this.base}/${id}`, payload);
  }

  remove(id: string) {
    return this.http.delete<{ deleted: boolean }>(`${this.base}/${id}`);
  }
}
