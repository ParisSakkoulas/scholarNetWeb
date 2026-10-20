import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environmets/environment';
import { RatingSummary, RatingTarget } from '../models/rating.model';

/** For profiles, `id` is the profile owner's user id. */
@Injectable({ providedIn: 'root' })
export class RatingsService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/ratings`;

  get(type: RatingTarget, id: string): Observable<RatingSummary> {
    return this.http.get<RatingSummary>(`${this.api}/${type}/${id}`);
  }

  rate(type: RatingTarget, id: string, value: number): Observable<RatingSummary> {
    return this.http.put<RatingSummary>(`${this.api}/${type}/${id}`, { value });
  }

  remove(type: RatingTarget, id: string): Observable<RatingSummary> {
    return this.http.delete<RatingSummary>(`${this.api}/${type}/${id}`);
  }
}
