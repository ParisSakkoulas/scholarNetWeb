import { CollectionBlueprint } from '../../../shared/types/Collection-Blueprint/collection-blueprint.types';
import { Project } from '../models/project.model';

const statusLabel: Record<string, string> = {
  active: 'Active',
  archived: 'Archived',
  planning: 'Planning',
};

export const projectsBlueprint: CollectionBlueprint<Project> = {
  name: 'project',
  table: {
    pageSize: 10,
    defaultSort: { field: 'name', order: 'asc' },
    emptyMessage: 'No projects yet.',
    search: true,
    searchPlaceholder: 'Search projects by name...',
  },
  fields: [
    { key: 'name', label: 'Project', table: { sortable: true } },
    {
      key: 'status',
      label: 'Status',
      table: { sortable: true, format: (v: string) => statusLabel[v] ?? v },
    },
  ],
};
