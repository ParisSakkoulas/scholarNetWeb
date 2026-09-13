export interface Team {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  ownerId: string;
  visibility: 'public' | 'private';
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamPayload {
  name: string;
  slug: string;
  description?: string;
  visibility?: 'public' | 'private';
}

export type UpdateTeamPayload = Partial<CreateTeamPayload>;
