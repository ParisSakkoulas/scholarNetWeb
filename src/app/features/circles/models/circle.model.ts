export type CircleStage = 'thesis' | 'paper' | 'grant' | 'other';
export type CircleVisibility = 'public' | 'invite';
export type CircleStatus = 'active' | 'paused' | 'closed';
export type CircleMemberStatus = 'pending' | 'active' | 'paused' | 'left' | 'removed';
export type SessionStatus = 'planned' | 'done' | 'cancelled';
export type SessionResult = 'done' | 'partial' | 'missed';

export interface PersonRef {
  _id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profilePhotoUrl?: string;
}

/** Weekly recurrence. `weekday` is ISO: 1 = Monday ... 7 = Sunday. `time` is local to `timezone`. */
export interface CircleSchedule {
  weekday: number;
  time: string;
  durationMin: number;
  timezone: string;
}

export interface CircleMemberRow {
  _id: string;
  userId: PersonRef;
  role: 'owner' | 'member';
  status: CircleMemberStatus;
  streak: number;
  totalSessions: number;
}

export interface Circle {
  _id: string;
  name: string;
  description?: string;
  field: string;
  stage: CircleStage;
  visibility: CircleVisibility;
  ownerId: PersonRef | string;
  maxMembers: number;
  schedule: CircleSchedule;
  /** only sent to members */
  meetingUrl?: string;
  status: CircleStatus;
  memberCount?: number;
  myStatus?: CircleMemberStatus | null;
  myRole?: 'owner' | 'member' | null;
  nextSessionAt?: string | null;
  /** only sent to members (the owner also sees pending requests) */
  members?: CircleMemberRow[];
}

export interface SessionEntry {
  userId: PersonRef | string;
  attended: boolean;
  goal?: string;
  result?: SessionResult;
  note?: string;
}

export interface CircleSession {
  _id: string;
  circleId: string;
  startsAt: string;
  durationMin: number;
  status: SessionStatus;
  entries: SessionEntry[];
}

export interface MyCircle {
  circle: Circle;
  myStatus: CircleMemberStatus;
  streak: number;
  nextSession: CircleSession | null;
}

export interface Page<T> {
  data: T[];
  total: number;
}

export interface CirclePayload {
  name: string;
  description?: string;
  field: string;
  stage: CircleStage;
  visibility: CircleVisibility;
  maxMembers: number;
  schedule: CircleSchedule;
  meetingUrl?: string;
}

export interface CircleFilters {
  field?: string;
  stage?: CircleStage | '';
  visibility?: CircleVisibility | '';
  timezone?: string;
  page?: number;
  pageSize?: number;
}

export const STAGE_OPTIONS: { label: string; value: CircleStage }[] = [
  { label: 'Thesis', value: 'thesis' },
  { label: 'Paper', value: 'paper' },
  { label: 'Grant', value: 'grant' },
  { label: 'Other', value: 'other' },
];

export const VISIBILITY_OPTIONS: { label: string; value: CircleVisibility }[] = [
  { label: 'Public: anyone can join', value: 'public' },
  { label: 'Invite-only: owner approves', value: 'invite' },
];

export const WEEKDAY_OPTIONS = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 7 },
];

export const MAX_MEMBERS_LIMIT = 8;
export const DEFAULT_MAX_MEMBERS = 6;

const HOUR = 60 * 60 * 1000;

export const personName = (p: PersonRef | string | null | undefined): string => {
  if (!p) return '';
  if (typeof p === 'string') return p;
  return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || p.username || '';
};

export const personId = (p: PersonRef | string): string => (typeof p === 'string' ? p : p._id);

export const sessionEnd = (s: Pick<CircleSession, 'startsAt' | 'durationMin'>): number =>
  new Date(s.startsAt).getTime() + s.durationMin * 60 * 1000;

/** Same windows the API enforces; used to show or hide the forms. */
export const isGoalOpen = (s: CircleSession, now = Date.now()): boolean =>
  s.status === 'planned' &&
  now >= new Date(s.startsAt).getTime() - 24 * HOUR &&
  now <= sessionEnd(s);

export const isCheckoutOpen = (s: CircleSession, now = Date.now()): boolean =>
  s.status !== 'cancelled' &&
  now >= new Date(s.startsAt).getTime() &&
  now <= sessionEnd(s) + 24 * HOUR;

export const RESULT_LABEL: Record<SessionResult, string> = {
  done: 'Reached my goal',
  partial: 'Partly',
  missed: 'Did not get to it',
};

export const STAGE_LABEL: Record<CircleStage, string> = {
  thesis: 'Thesis',
  paper: 'Paper',
  grant: 'Grant',
  other: 'Other',
};
