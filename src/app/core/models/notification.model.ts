import { PagedResult } from './follow.model';

/** Same values as the API's NotificationType enum. */
export type NotificationType =
  | 'NEW_FOLLOWER'
  | 'TEAM_INVITE'
  | 'TEAM_INVITE_ACCEPTED'
  | 'TASK_ASSIGNED'
  | 'MENTION'
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
  SYSTEM: {
    label: 'System',
    icon: 'pi pi-info-circle',
    color: 'bg-slate-200 text-slate-700',
  },
};
