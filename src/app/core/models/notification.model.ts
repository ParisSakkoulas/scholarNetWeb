import { PagedResult } from './follow.model';

/** Same values as the API's NotificationType enum. */
export type NotificationType =
  | 'NEW_FOLLOWER'
  | 'POST_LIKED'
  | 'POST_COMMENTED'
  | 'TEAM_INVITE'
  | 'TEAM_INVITE_ACCEPTED'
  | 'TASK_ASSIGNED'
  | 'MENTION'
  | 'FILE_ACCESS_REQUEST'
  | 'FILE_ACCESS_APPROVED'
  | 'FILE_ACCESS_REJECTED'
  | 'PUBLICATION_AUTHOR_INVITE'
  | 'PUBLICATION_AUTHOR_ACCEPTED'
  | 'PUBLICATION_AUTHOR_DECLINED'
  | 'PUBLICATION_AUTHOR_REMOVED'
  | 'SUPERVISION_INVITE'
  | 'SUPERVISION_RESPONDED'
  | 'SUPERVISION_ENDED'
  | 'MILESTONE_DUE_SOON'
  | 'MILESTONE_OVERDUE'
  | 'ACTION_ITEM_ASSIGNED'
  | 'ACTION_ITEM_DUE_SOON'
  | 'ACTION_ITEM_OVERDUE'
  | 'MEETING_REMINDER'
  | 'DOCUMENT_READY_FOR_REVIEW'
  | 'DOCUMENT_REVIEWED'
  | 'DOCUMENT_COMMENT'
  | 'DOCUMENT_REPLY'
  | 'SYSTEM';

export interface AppNotification {
  _id: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  /** who triggered it; null for system notifications */
  actor?: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
    profilePhotoUrl?: string;
  } | null;
  /** what it is about, used for deep links (e.g. 'user', 'team') */
  entityType?: string | null;
  entityId?: string | null;
  data?: Record<string, unknown> | null;
}

export type NotificationPage = PagedResult<AppNotification>;

export interface NotificationTypeMeta {
  label: string;
  icon: string;
  /** Tailwind classes for the round icon badge */
  color: string;
}

/** Look of each notification topic, shared by the bell menu and the full page. */
export const NOTIFICATION_TYPE_META: Record<
  NotificationType,
  NotificationTypeMeta
> = {
  NEW_FOLLOWER: {
    label: 'Followers',
    icon: 'pi pi-user-plus',
    color: 'bg-blue-100 text-blue-700',
  },
  POST_LIKED: {
    label: 'Likes',
    icon: 'pi pi-thumbs-up-fill',
    color: 'bg-rose-100 text-rose-700',
  },
  POST_COMMENTED: {
    label: 'Comments',
    icon: 'pi pi-comment',
    color: 'bg-sky-100 text-sky-700',
  },
  TEAM_INVITE: {
    label: 'Team invites',
    icon: 'pi pi-users',
    color: 'bg-emerald-100 text-emerald-700',
  },
  TEAM_INVITE_ACCEPTED: {
    label: 'Team updates',
    icon: 'pi pi-user-plus',
    color: 'bg-emerald-100 text-emerald-700',
  },
  TASK_ASSIGNED: {
    label: 'Tasks',
    icon: 'pi pi-check-square',
    color: 'bg-amber-100 text-amber-700',
  },
  MENTION: {
    label: 'Mentions',
    icon: 'pi pi-at',
    color: 'bg-violet-100 text-violet-700',
  },
  FILE_ACCESS_REQUEST: {
    label: 'File requests',
    icon: 'pi pi-key',
    color: 'bg-amber-100 text-amber-700',
  },
  FILE_ACCESS_APPROVED: {
    label: 'File access',
    icon: 'pi pi-lock-open',
    color: 'bg-emerald-100 text-emerald-700',
  },
  FILE_ACCESS_REJECTED: {
    label: 'File access',
    icon: 'pi pi-lock',
    color: 'bg-rose-100 text-rose-700',
  },
  PUBLICATION_AUTHOR_INVITE: {
    label: 'Authorship invites',
    icon: 'pi pi-book',
    color: 'bg-amber-100 text-amber-700',
  },
  PUBLICATION_AUTHOR_ACCEPTED: {
    label: 'Authorship',
    icon: 'pi pi-check-circle',
    color: 'bg-emerald-100 text-emerald-700',
  },
  PUBLICATION_AUTHOR_DECLINED: {
    label: 'Authorship',
    icon: 'pi pi-times-circle',
    color: 'bg-rose-100 text-rose-700',
  },
  PUBLICATION_AUTHOR_REMOVED: {
    label: 'Authorship',
    icon: 'pi pi-user-minus',
    color: 'bg-slate-200 text-slate-700',
  },
  SUPERVISION_INVITE: {
    label: 'Supervision invites',
    icon: 'pi pi-graduation-cap',
    color: 'bg-amber-100 text-amber-700',
  },
  SUPERVISION_RESPONDED: {
    label: 'Supervision',
    icon: 'pi pi-check-circle',
    color: 'bg-emerald-100 text-emerald-700',
  },
  SUPERVISION_ENDED: {
    label: 'Supervision',
    icon: 'pi pi-flag',
    color: 'bg-slate-200 text-slate-700',
  },
  MILESTONE_DUE_SOON: {
    label: 'Milestones',
    icon: 'pi pi-clock',
    color: 'bg-amber-100 text-amber-700',
  },
  MILESTONE_OVERDUE: {
    label: 'Milestones',
    icon: 'pi pi-exclamation-triangle',
    color: 'bg-rose-100 text-rose-700',
  },
  ACTION_ITEM_ASSIGNED: {
    label: 'Action items',
    icon: 'pi pi-check-square',
    color: 'bg-amber-100 text-amber-700',
  },
  ACTION_ITEM_DUE_SOON: {
    label: 'Action items',
    icon: 'pi pi-clock',
    color: 'bg-amber-100 text-amber-700',
  },
  ACTION_ITEM_OVERDUE: {
    label: 'Action items',
    icon: 'pi pi-exclamation-triangle',
    color: 'bg-rose-100 text-rose-700',
  },
  MEETING_REMINDER: {
    label: 'Meetings',
    icon: 'pi pi-calendar',
    color: 'bg-sky-100 text-sky-700',
  },
  DOCUMENT_READY_FOR_REVIEW: {
    label: 'Documents',
    icon: 'pi pi-file-edit',
    color: 'bg-amber-100 text-amber-700',
  },
  DOCUMENT_REVIEWED: {
    label: 'Documents',
    icon: 'pi pi-check-circle',
    color: 'bg-emerald-100 text-emerald-700',
  },
  DOCUMENT_COMMENT: {
    label: 'Document comments',
    icon: 'pi pi-comment',
    color: 'bg-sky-100 text-sky-700',
  },
  DOCUMENT_REPLY: {
    label: 'Document comments',
    icon: 'pi pi-reply',
    color: 'bg-sky-100 text-sky-700',
  },
  SYSTEM: {
    label: 'System',
    icon: 'pi pi-info-circle',
    color: 'bg-slate-200 text-slate-700',
  },
};
