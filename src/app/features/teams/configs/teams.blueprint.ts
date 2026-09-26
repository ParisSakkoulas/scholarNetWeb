import { CollectionBlueprint } from '../../../shared/types/Collection-Blueprint/collection-blueprint.types';

export interface Team {
  _id: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  memberCount: number;
  createdAt: string;
}

const roleLabel: Record<Team['role'], string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

export const teamsBlueprint: CollectionBlueprint<Team> = {
  name: 'team',
  table: {
    pageSize: 10,
    defaultSort: { field: 'name', order: 'asc' },
    emptyMessage: "You're not part of any teams yet.",
    search: true,
    searchPlaceholder: 'Search teams by name...',
  },
  fields: [
    { key: 'name', label: 'Team', table: { sortable: true } },
    {
      key: 'role',
      label: 'Your role',
      table: { sortable: true, format: (v: Team['role']) => roleLabel[v] },
    },
    { key: 'memberCount', label: 'Members', table: { sortable: true } },
    {
      key: 'createdAt',
      label: 'Created',
      table: {
        sortable: true,
        format: (v: string) => new Date(v).toLocaleDateString(),
      },
    },
    // No `form` on any field: this blueprint only drives the table.
    // Creating a team is its own dialog/page, not a generic blueprint form,
    // since "add a member", "pick a plan" etc. don't fit a flat field list.
  ],
};
