/** Matches GET /follows/:userId/status */
export interface FollowStatus {
  isFollowing: boolean;
  isFollowedBy: boolean;
}

/** Matches GET /follows/:userId/counts */
export interface FollowCounts {
  followers: number;
  following: number;
}

/** A user row in the followers / following lists. */
export interface FollowUser {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  profilePhotoUrl?: string;
  followedAt: string;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export type FollowListMode = 'followers' | 'following';
