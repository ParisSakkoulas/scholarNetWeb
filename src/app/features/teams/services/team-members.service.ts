import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  TeamMember,
  InviteMemberPayload,
  UpdateMemberRolePayload,
} from '../models/team-member.model';
import { environment } from '../../../../environmets/environment';

@Injectable({ providedIn: 'root' })
export class TeamMembersService {
  private base = (teamId: string) =>
    `${environment.apiUrl}/teams/${teamId}/members`;

  constructor(private http: HttpClient) {}

  list(teamId: string) {
    return this.http.get<TeamMember[]>(this.base(teamId));
  }

  invite(teamId: string, payload: InviteMemberPayload) {
    return this.http.post<TeamMember>(this.base(teamId), payload);
  }

  acceptInvite(teamId: string) {
    return this.http.post<TeamMember>(`${this.base(teamId)}/accept`, {});
  }

  updateRole(teamId: string, userId: string, payload: UpdateMemberRolePayload) {
    return this.http.patch<TeamMember>(
      `${this.base(teamId)}/${userId}`,
      payload,
    );
  }

  remove(teamId: string, userId: string) {
    return this.http.delete<{ removed: boolean }>(
      `${this.base(teamId)}/${userId}`,
    );
  }
}
