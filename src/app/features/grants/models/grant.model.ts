export type GrantStatus = 'pending' | 'open' | 'closed' | 'rejected';
export type GrantSaveState = 'saved' | 'dismissed';
export type CareerStage = 'phd' | 'postdoc' | 'early' | 'established';
export type FundingType = 'project' | 'fellowship' | 'travel' | 'other';

export interface GrantAmount {
  min?: number;
  max?: number;
  currency: string;
}

export interface Submitter {
  _id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface GrantCall {
  _id: string;
  title: string;
  funder: string;
  /** official call page (https) */
  url: string;
  description: string;
  /** ISO 3166 alpha-2; empty = eligible everywhere */
  countries: string[];
  /** empty = any */
  careerStages: CareerStage[];
  fields: string[];
  fundingType: FundingType;
  amount?: GrantAmount;
  opensAt?: string;
  deadline: string;
  lastCheckedAt: string;
  status: GrantStatus;
  source: 'admin' | 'user' | 'import';
  /** only sent to the submitter and to admins */
  submittedBy?: Submitter | string;
  reviewNote?: string;
  mySave?: GrantSaveState | null;
  /** only on the "For you" list */
  fit?: Fit;
  createdAt: string;
}

/** How well a call fits the user's preferences, with short reasons. */
export interface Fit {
  score: number;
  reasons: string[];
}

export interface GrantPreferences {
  countries: string[];
  careerStage?: CareerStage | null;
  fields: string[];
  fundingTypes: FundingType[];
  alertsEnabled: boolean;
}

export interface MatchesPage extends Page<GrantCall> {
  hasPreferences: boolean;
}

export interface Page<T> {
  data: T[];
  total: number;
}

export type GrantTab = 'all' | 'saved' | 'dismissed';

export interface GrantFilters {
  search?: string;
  country?: string;
  careerStage?: CareerStage | '';
  field?: string;
  fundingType?: FundingType | '';
  deadlineFrom?: string;
  deadlineTo?: string;
  includeClosed?: boolean;
  tab?: GrantTab;
  sort?: string;
  page?: number;
  pageSize?: number;
}

/** What the create / submit / edit form sends. */
export interface GrantPayload {
  title: string;
  funder: string;
  url: string;
  description: string;
  countries: string[];
  careerStages: CareerStage[];
  fields: string[];
  fundingType: FundingType;
  amount?: GrantAmount;
  opensAt?: string;
  deadline: string;
  lastCheckedAt?: string;
}

export const CAREER_STAGE_OPTIONS: { label: string; value: CareerStage }[] = [
  { label: 'PhD student', value: 'phd' },
  { label: 'Postdoc', value: 'postdoc' },
  { label: 'Early career', value: 'early' },
  { label: 'Established', value: 'established' },
];

export const FUNDING_TYPE_OPTIONS: { label: string; value: FundingType }[] = [
  { label: 'Project', value: 'project' },
  { label: 'Fellowship', value: 'fellowship' },
  { label: 'Travel', value: 'travel' },
  { label: 'Other', value: 'other' },
];

export const SORT_OPTIONS = [
  { label: 'Deadline: soonest first', value: 'deadline' },
  { label: 'Deadline: latest first', value: '-deadline' },
  { label: 'Recently added', value: '-createdAt' },
];

export const STATUS_META: Record<GrantStatus, { label: string; severity: 'success' | 'info' | 'warn' | 'danger' | 'secondary' }> = {
  pending: { label: 'Pending review', severity: 'warn' },
  open: { label: 'Open', severity: 'success' },
  closed: { label: 'Closed', severity: 'secondary' },
  rejected: { label: 'Rejected', severity: 'danger' },
};

/** Shown on every call: the platform cannot promise a call is accurate or that someone is eligible. */
export const DISCLAIMER = 'Check the official page for eligibility and deadlines.';

/** { code, name } for every assigned ISO 3166 region, named in English. Built from the browser's own data. */
export function countryOptions(): { code: string; name: string }[] {
  const names = new Intl.DisplayNames(['en'], { type: 'region' });
  const result: { code: string; name: string }[] = [];
  const A = 65;
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const code = String.fromCharCode(A + i, A + j);
      let name: string | undefined;
      try {
        name = names.of(code);
      } catch {
        continue;
      }
      // unassigned codes come back unchanged
      if (name && name !== code) result.push({ code, name });
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export const daysLeft = (deadline: string, now = Date.now()): number =>
  Math.ceil((new Date(deadline).getTime() - now) / (24 * 60 * 60 * 1000));

export function deadlineText(deadline: string, now = Date.now()): string {
  const d = daysLeft(deadline, now);
  if (d < 0) return 'Closed';
  if (d === 0) return 'Due today';
  if (d === 1) return '1 day left';
  return `${d} days left`;
}

/** Colour of the countdown: urgent inside a week. */
export function deadlineTone(deadline: string, now = Date.now()): string {
  const d = daysLeft(deadline, now);
  if (d < 0) return 'text-surface-500';
  if (d <= 7) return 'text-red-600';
  if (d <= 30) return 'text-amber-600';
  return 'text-surface-600';
}

export function amountText(a?: GrantAmount): string {
  if (!a || (a.min == null && a.max == null)) return '';
  const fmt = (n: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: a.currency, maximumFractionDigits: 0 }).format(n);
  if (a.min != null && a.max != null) return a.min === a.max ? fmt(a.min) : `${fmt(a.min)} to ${fmt(a.max)}`;
  return a.max != null ? `Up to ${fmt(a.max)}` : `From ${fmt(a.min!)}`;
}

export const submitterName = (s?: Submitter | string): string => {
  if (!s) return '';
  if (typeof s === 'string') return s;
  return `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || s.username || '';
};
