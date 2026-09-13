import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../environmets/environment';
import { Team } from '../models/team.model';

@Injectable({ providedIn: 'root' })
export class TeamsService {
  private base = `${environment.apiUrl}/teams`;
  constructor(private http: HttpClient) {}

  getMyTeams() {
    return this.http.get<Team[]>(this.base);
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
