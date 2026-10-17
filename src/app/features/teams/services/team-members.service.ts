import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  TeamMember,
  TeamInvitation,
  TeamRole,
  InviteMemberPayload,
  UpdateMemberRolePayload,
} from '../models/team-member.model';
import { environment } from '../../../../environmets/environment';

@Injectable({ providedIn: 'root' })
export class TeamMembersService {
  private base = (teamId: string) =>
    `${environment.apiUrl}/teams/${teamId}/members`;
  private readonly invitationsUrl = `${environment.apiUrl}/teams/invitations`;

  constructor(private http: HttpClient) {}

  list(teamId: string) {
    return this.http.get<TeamMember[]>(this.base(teamId));
  }

  /** The signed-in user's role in this team. */
  myRole(teamId: string) {
    return this.http.get<{ role: TeamRole }>(`${this.base(teamId)}/me`);
  }

  /** Admin / owner: invite a user. Also used to re-invite after a decline. */
  invite(teamId: string, payload: InviteMemberPayload) {
    return this.http.post<TeamMember>(this.base(teamId), payload);
  }

  updateRole(teamId: string, userId: string, payload: UpdateMemberRolePayload) {
    return this.http.patch<TeamMember>(
      `${this.base(teamId)}/${userId}`,
      payload,
    );
  }

  /** Removes a member, or cancels their pending invite. */
  remove(teamId: string, userId: string) {
    return this.http.delete<{ removed: boolean }>(
      `${this.base(teamId)}/${userId}`,
    );
  }

  /** Any active member except the owner. */
  leave(teamId: string) {
    return this.http.post<{ left: boolean }>(`${this.base(teamId)}/leave`, {});
  }

  // ---------------- invitations for the signed-in user ----------------

  myInvitations() {
    return this.http.get<TeamInvitation[]>(`${this.invitationsUrl}/me`);
  }

  acceptInvitation(teamId: string) {
    return this.http.post<TeamMember>(
      `${this.invitationsUrl}/${teamId}/accept`,
      {},
    );
  }

  declineInvitation(teamId: string) {
    return this.http.post<{ declined: boolean }>(
      `${this.invitationsUrl}/${teamId}/decline`,
      {},
    );
  }
}
