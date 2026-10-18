import { ProfileLink } from '../../shared/interfaces/Profile/profile-linkt';

/** Who can see a contact detail on a profile. */
export type ContactVisibilityLevel = 'public' | 'connections' | 'private';

export interface ContactVisibility {
  /** city, country and timezone */
  location: ContactVisibilityLevel;
  website: ContactVisibilityLevel;
  phone: ContactVisibilityLevel;
}

export const CONTACT_VISIBILITY_OPTIONS: {
  label: string;
  value: ContactVisibilityLevel;
}[] = [
  { label: 'Everyone', value: 'public' },
  { label: 'Connections only', value: 'connections' },
  { label: 'Only me', value: 'private' },
];

export interface ProfilePosition {
  _id: string;
  title: string;
  institution: string;
  department?: string;
  startDate: string; // ISO date
  endDate?: string;
  current: boolean;
}

export interface ProfileEducation {
  _id: string;
  degree: string;
  fieldOfStudy?: string;
  institution: string;
  startYear: number;
  endYear: number | null;
}

export interface ProfileSkill {
  _id: string;
  name: string;
  endorsementCount: number;
}

export interface ProfileInterest {
  _id: string;
  name: string;
}

/** Matches the API route segment: /profile/me/{section} */
export type ProfileSectionKey =
  | 'positions'
  | 'education'
  | 'skills'
  | 'interests';

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
  /** Only present when the owner's visibility setting lets this viewer see it. */
  website?: string;
  phone?: string;
  /** Sent to the owner only. */
  contactVisibility?: ContactVisibility;
  pronouns?: string;
  languages?: string[];
  availability?: string[];

  links?: ProfileLink[];

  positions: ProfilePosition[];
  pinnedItems: PinnedItem[];

  education: ProfileEducation[];
  skills: ProfileSkill[];
  interests: ProfileInterest[];
  yearlyPublications: YearlyCount[];

  createdAt: Date;
  updatedAt: Date;
}

/** One row of GET /profile?q= — a trimmed profile with the user populated. */
export interface ProfileSearchResult {
  _id: string;
  user: Pick<
    UserProfile,
    '_id' | 'firstName' | 'lastName' | 'username' | 'profilePhotoUrl'
  >;
  headline?: string;
  country?: string;
  city?: string;
  verified?: boolean;
  skills?: ProfileSkill[];
  interests?: ProfileInterest[];
}

export interface ProfileSearchPage {
  items: ProfileSearchResult[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateProfile {
  headline?: string;
  bio?: string;
  city?: string;
  timezone?: string;
  website?: string | null;
  phone?: string | null;
  contactVisibility?: Partial<ContactVisibility>;
  country?: string;
  orcidId?: string;
}
