import { CollectionBlueprint } from '../../../shared/types/Collection-Blueprint/collection-blueprint.types';
import { GrantCall, STATUS_META, submitterName } from '../models/grant.model';

/** Drives the moderator table. Creating and editing use the grant form dialog, so no `form` here. */
export const grantsManageBlueprint: CollectionBlueprint<GrantCall> = {
  name: 'grant-manage',
  table: {
    pageSize: 10,
    defaultSort: { field: 'createdAt', order: 'desc' },
    emptyMessage: 'No calls here.',
    search: true,
    searchPlaceholder: 'Search by title or funder...',
    columnChooser: true,
  },
  fields: [
    { key: 'title', label: 'Call', table: { sortable: true } },
    { key: 'funder', label: 'Funder', table: { sortable: true } },
    {
      key: 'status',
      label: 'Status',
      table: { sortable: true, format: (v: GrantCall['status']) => STATUS_META[v].label },
    },
    {
      key: 'deadline',
      label: 'Deadline',
      table: { sortable: true, format: (v: string) => new Date(v).toLocaleDateString() },
    },
    {
      key: 'source',
      label: 'Source',
      table: { hidden: true, format: (v: GrantCall['source']) => (v === 'user' ? 'User' : v === 'admin' ? 'Admin' : 'Import') },
    },
    {
      key: 'submittedBy',
      label: 'Submitted by',
      table: { hidden: true, format: (v: GrantCall['submittedBy']) => submitterName(v) },
    },
    {
      key: 'createdAt',
      label: 'Added',
      table: { sortable: true, hidden: true, format: (v: string) => new Date(v).toLocaleDateString() },
    },
  ],
};
