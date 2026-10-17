export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';
export type MemberStatus = 'active' | 'invited' | 'removed';

export interface PopulatedMemberUser {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePhotoUrl?: string;
}

export interface TeamMember {
  _id: string;
  teamId: string;
  userId: PopulatedMemberUser | string;
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

/** A pending invite for the signed-in user (GET /teams/invitations/me). */
export interface TeamInvitation {
  _id: string;
  role: Exclude<TeamRole, 'owner'>;
  status: 'invited';
  createdAt: string;
  teamId: {
    _id: string;
    name: string;
    slug?: string;
    description?: string;
    avatarUrl?: string;
    visibility?: string;
  };
  invitedBy?: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    profilePhotoUrl?: string;
  };
}
