import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environmets/environment';
import { Team } from '../models/team.model';
import { Page, PageQuery } from '../../../shared/models/page-query';

@Injectable({ providedIn: 'root' })
export class TeamsService {
  private base = `${environment.apiUrl}/teams`;
  constructor(private http: HttpClient) {}

  getMyTeams() {
    return this.http.get<Team[]>(this.base);
  }

  getMyTeamsPage(query: PageQuery): Observable<Page<Team>> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('pageSize', query.pageSize);

    if (query.sortField) {
      params = params
        .set('sortField', query.sortField)
        .set('sortOrder', query.sortOrder ?? 'asc');
    }
    if (query.search) {
      params = params.set('search', query.search);
    }

    return this.http.get<Page<Team>>(this.base, { params });
  }

  getTeam(teamId: string) {
    return this.http.get<Team>(`${this.base}/${teamId}`);
  }
  createTeam(dto: Partial<Team>) {
    return this.http.post<Team>(this.base, dto);
  }

  updateTeam(teamId: string, dto: Partial<Team>) {
    return this.http.patch<Team>(`${this.base}/${teamId}`, dto);
  }

  deleteTeam(teamId: string) {
    return this.http.delete(`${this.base}/${teamId}`);
  }
}
