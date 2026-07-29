import { ProfileLink } from '../../shared/interfaces/Profile/profile-linkt';

export interface ProfilePosition {
  _id: string;
  title: string;
  institution: string;
  department?: string;
  startYear: number;
  endYear: number | null;
  current: boolean;
}

export interface ProfileStat {
  value: string;
  label: string;
  detail?: string;
  detailEmphasis?: boolean;
}

export interface PinnedItem {
  _id: string;
  index: string;
  kind: string;
  title: string;
  detail: string;
}

export interface UserProfile {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  profilePhotoUrl?: string; // ← optional: the header tests the no-photo fallback explicitly
}

export interface YearlyCount {
  year: number;
  count: number;
}

export interface Profile {
  user: UserProfile;

  bio: string;
  verified: boolean;
  profileViews: number;
  citationCount: number;
  hIndex: number;
  i10Index: number;

  // ── header fields ──────────────────────────────────────────
  headline?: string; // fallback line when there's no current position
  country?: string;
  city?: string;
  timezone?: string;

  orcidId?: string;
  scopusId?: string;
  googleScholarId?: string;
  arxivId?: string;
  researcherId?: string;
  websiteUrl?: string;
  pronouns?: string;
  languages?: string[];
  availability?: string[];

  links?: ProfileLink[];

  positions: ProfilePosition[];
  pinnedItems: PinnedItem[];

  education: unknown[];
  skills: unknown[];
  interests: unknown[];
  yearlyPublications: YearlyCount[];

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProfile {
  headline?: string;
  bio?: string;
  city?: string;
  timezone?: string;
  websiteUrl?: string;
  country?: string;
  orcidId?: string;
}
