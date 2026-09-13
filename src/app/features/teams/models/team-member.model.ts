export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';
export type MemberStatus = 'active' | 'invited' | 'removed';

export interface TeamMember {
  _id: string;
  teamId: string;
  userId:
    | {
        _id: string;
        name: string;
        email: string;
        avatarUrl?: string;
      }
    | string;
  role: TeamRole;
  status: MemberStatus;
  invitedBy?: string;
  joinedAt?: string;
  createdAt: string;
}

export interface InviteMemberPayload {
  userId: string;
  role?: Exclude<TeamRole, 'owner'>;
}

export interface UpdateMemberRolePayload {
  role: Exclude<TeamRole, 'owner'>;
}
