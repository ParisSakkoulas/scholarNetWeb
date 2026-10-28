import { GrantStatus } from './grant.model';

export interface PersonRef {
  _id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profilePhotoUrl?: string;
}

export type ProposalStatus = 'planning' | 'writing' | 'review' | 'submitted' | 'awarded' | 'rejected';
export type SectionStatus = 'todo' | 'writing' | 'review' | 'done';

export interface ProposalFile {
  _id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedBy?: PersonRef | string;
  createdAt: string;
}

export type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'cancelled';

export interface SectionReview {
  _id: string;
  reviewerId: PersonRef | string;
  requestedBy: PersonRef | string;
  note?: string;
  status: ReviewStatus;
  response?: string;
  respondedAt?: string;
  createdAt: string;
}

export interface ProposalComment {
  _id: string;
  authorId: PersonRef | string;
  body: string;
  createdAt: string;
}

/** Somebody who can be asked to review a section. */
export interface ReviewerCandidate {
  userId: string;
  name: string;
  kind: 'teammate' | 'supervisor';
}

/** A review request waiting for the signed-in user. */
export interface MyReview {
  _id: string;
  proposalId: { _id: string; title: string };
  sectionId: { _id: string; title: string };
  requestedBy: PersonRef;
  note?: string;
  createdAt: string;
}

export interface ProposalHistory {
  total: number;
  active: number;
  submitted: number;
  awaiting: number;
  awarded: number;
  notFunded: number;
  /** awarded out of the answered ones; null until there is an answer */
  successRate: number | null;
  decidedProposals: {
    _id: string;
    title: string;
    funder?: string;
    status: ProposalStatus;
    decidedAt?: string;
    outcomeNote?: string;
  }[];
}

export interface ProposalSection {
  _id: string;
  title: string;
  status: SectionStatus;
  ownerId?: PersonRef | string | null;
  dueDate?: string | null;
  files: ProposalFile[];
  reviews?: SectionReview[];
}

/** The slice of the grant call a proposal carries along. */
export interface ProposalCall {
  _id: string;
  title: string;
  funder: string;
  url: string;
  deadline: string;
  status: GrantStatus;
  lastCheckedAt: string;
}

export interface Proposal {
  _id: string;
  callId: ProposalCall;
  teamId?: { _id: string; name: string } | null;
  ownerId: string;
  title: string;
  status: ProposalStatus;
  internalDeadline?: string | null;
  outcomeNote?: string;
  submittedAt?: string;
  decidedAt?: string;
  projectId?: string;
  boardId?: string;
  createdAt: string;
  /** list view */
  progress?: { total: number; done: number };
  /** detail view */
  sections?: ProposalSection[];
  access?: { canManage: boolean; canWrite: boolean; isReviewer?: boolean };
}

export interface StartProposalPayload {
  title?: string;
  teamId?: string;
  internalDeadline?: string;
}

export const PROPOSAL_STATUS_OPTIONS: { label: string; value: ProposalStatus }[] = [
  { label: 'Planning', value: 'planning' },
  { label: 'Writing', value: 'writing' },
  { label: 'In review', value: 'review' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Awarded', value: 'awarded' },
  { label: 'Not funded', value: 'rejected' },
];

export const SECTION_STATUS_OPTIONS: { label: string; value: SectionStatus }[] = [
  { label: 'To do', value: 'todo' },
  { label: 'Writing', value: 'writing' },
  { label: 'In review', value: 'review' },
  { label: 'Done', value: 'done' },
];

export const PROPOSAL_STATUS_META: Record<ProposalStatus, { label: string; severity: 'info' | 'warn' | 'success' | 'danger' | 'secondary' }> = {
  planning: { label: 'Planning', severity: 'secondary' },
  writing: { label: 'Writing', severity: 'info' },
  review: { label: 'In review', severity: 'warn' },
  submitted: { label: 'Submitted', severity: 'success' },
  awarded: { label: 'Awarded', severity: 'success' },
  rejected: { label: 'Not funded', severity: 'danger' },
};

export const SECTION_STATUS_SEVERITY: Record<SectionStatus, 'info' | 'warn' | 'success' | 'secondary'> = {
  todo: 'secondary',
  writing: 'info',
  review: 'warn',
  done: 'success',
};

export function fileSizeText(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
