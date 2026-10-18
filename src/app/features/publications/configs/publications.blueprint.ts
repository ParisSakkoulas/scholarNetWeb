import {
  PUBLICATION_TYPE_LABEL,
  PUBLICATION_VISIBILITY_LABEL,
  Publication,
} from '../../../core/models/publication.model';
import { CollectionBlueprint } from '../../../shared/types/Collection-Blueprint/collection-blueprint.types';

export const publicationsBlueprint: CollectionBlueprint<Publication> = {
  name: 'publication',
  table: {
    pageSize: 10,
    emptyMessage: 'No publications found.',
    search: true,
    searchPlaceholder: 'Search title, abstract, keywords...',
    columnChooser: true,
  },
  fields: [
    { key: 'title', label: 'Title' },
    {
      key: 'type',
      label: 'Type',
      table: {
        format: (v: Publication['type']) => PUBLICATION_TYPE_LABEL[v] ?? v,
      },
    },
    {
      key: 'authors',
      label: 'Authors',
      table: {
        format: (v: Publication['authors']) =>
          (v ?? []).map((a) => a.name).join(', '),
      },
    },
    { key: 'year', label: 'Year', table: { width: '6rem' } },
    {
      key: 'visibility',
      label: 'Visibility',
      table: {
        format: (v: Publication['visibility']) =>
          PUBLICATION_VISIBILITY_LABEL[v] ?? v,
      },
    },
    {
      key: 'uploadedBy',
      label: 'Uploaded by',
      table: {
        hidden: true,
        format: (v: Publication['uploadedBy']) =>
          v ? `${v.firstName} ${v.lastName}` : '',
      },
    },
    {
      key: 'createdAt',
      label: 'Added',
      table: {
        hidden: true,
        format: (v: string) => new Date(v).toLocaleDateString(),
      },
    },
  ],
};
