export type SupervisionStatus = 'pending' | 'active' | 'ended' | 'declined';
export type SupervisionRole = 'student' | 'supervisor';
export type MilestoneStatus =
  | 'todo'
  | 'in_progress'
  | 'submitted'
  | 'needs_changes'
  | 'approved';
export type MeetingStatus = 'planned' | 'done' | 'cancelled';
export type ActionItemStatus = 'open' | 'done';

export interface PersonRef {
  _id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profilePhotoUrl?: string;
}

export interface SupervisionStats {
  milestonesTotal: number;
  milestonesApproved: number;
  /** 0-100 */
  progress: number;
  overdueMilestones: number;
  openActionItems: number;
  overdueActionItems: number;
  overdueCount: number;
  nextMeeting: { _id: string; scheduledAt: string } | null;
  nextDueDate: string | null;
}

/** studentId / supervisorIds are populated on the list and overview calls. */
export interface Supervision {
  _id: string;
  title: string;
  status: SupervisionStatus;
  studentId: PersonRef;
  supervisorIds: PersonRef[];
  inviteEmail?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
  /** only on the supervisor dashboard */
  supervisorRole?: 'primary' | 'co-supervisor';
  stats?: SupervisionStats | null;
}

export interface Milestone {
  _id: string;
  supervisionId: string;
  title: string;
  description?: string;
  order: number;
  dueDate?: string | null;
  status: MilestoneStatus;
  completedAt?: string | null;
}

export interface AgendaItem {
  _id: string;
  text: string;
  addedBy: string;
}

export interface Meeting {
  _id: string;
  supervisionId: string;
  scheduledAt: string;
  status: MeetingStatus;
  agenda: AgendaItem[];
  notes?: string;
}

export interface ActionItem {
  _id: string;
  supervisionId: string;
  meetingId?: string | null;
  text: string;
  assigneeId: PersonRef;
  dueDate?: string | null;
  status: ActionItemStatus;
  /** files the supervisor attached for the student */
  attachments?: ActionItemFile[];
}

export interface ActionItemFile {
  _id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface MeetingWithItems extends Meeting {
  actionItems: ActionItem[];
}

export interface SupervisionOverview {
  supervision: Supervision;
  role: SupervisionRole;
  milestones: Milestone[];
  nextMeeting: Meeting | null;
  openActionItems: ActionItem[];
  stats: SupervisionStats | null;
}

export interface InvitePayload {
  title: string;
  supervisorId?: string;
  email?: string;
}

type Severity = 'secondary' | 'info' | 'warn' | 'danger' | 'success';

export const MILESTONE_STATUS_META: Record<
  MilestoneStatus,
  { label: string; severity: Severity }
> = {
  todo: { label: 'To do', severity: 'secondary' },
  in_progress: { label: 'In progress', severity: 'info' },
  submitted: { label: 'Submitted', severity: 'warn' },
  needs_changes: { label: 'Needs changes', severity: 'danger' },
  approved: { label: 'Approved', severity: 'success' },
};

export const SUPERVISION_STATUS_META: Record<
  SupervisionStatus,
  { label: string; severity: Severity }
> = {
  pending: { label: 'Waiting for reply', severity: 'warn' },
  active: { label: 'Active', severity: 'success' },
  ended: { label: 'Ended', severity: 'secondary' },
  declined: { label: 'Declined', severity: 'danger' },
};

export function personName(p?: PersonRef | null): string {
  if (!p) return '';
  return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || p.username || '';
}

/** A milestone or task is overdue when its due date passed and it is not finished. */
export function isOverdue(due?: string | null, finished = false): boolean {
  return !!due && !finished && new Date(due).getTime() < Date.now();
}

// ---------------- thesis documents ----------------

export type DocumentStatus = 'draft' | 'ready_for_review' | 'changes_requested' | 'reviewed';
export type CommentStatus = 'open' | 'resolved';

export interface ThesisDocument {
  _id: string;
  supervisionId: string;
  milestoneId?: string | null;
  meetingId?: string | null;
  title: string;
  mode: 'upload' | 'editor';
  status: DocumentStatus;
  currentVersion: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  _id: string;
  documentId: string;
  number: number;
  note?: string;
  createdBy: PersonRef | string;
  /** a supervisor's reviewed copy, or the student's own work */
  byRole?: SupervisionRole;
  createdAt: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
}

export interface ThesisDocumentDetail extends ThesisDocument {
  role: SupervisionRole;
  versions: DocumentVersion[];
  openThreads: number;
}

export interface DocumentComment {
  _id: string;
  documentId: string;
  versionId: string;
  authorId: PersonRef;
  text: string;
  parentId?: string | null;
  anchor?: { page?: number; from?: number; to?: number; quote?: string; before?: string; after?: string } | null;
  status: CommentStatus;
  createdAt: string;
  replies?: DocumentComment[];
}

export const DOCUMENT_STATUS_META: Record<DocumentStatus, { label: string; severity: Severity }> = {
  draft: { label: 'Draft', severity: 'secondary' },
  ready_for_review: { label: 'Ready for review', severity: 'warn' },
  changes_requested: { label: 'Changes requested', severity: 'danger' },
  reviewed: { label: 'Reviewed', severity: 'success' },
};

export interface DraftState {
  content: Record<string, unknown>;
  revision: number;
  updatedAt: string | null;
}
