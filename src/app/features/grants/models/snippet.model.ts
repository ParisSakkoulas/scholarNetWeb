export type SnippetType = 'bio' | 'institution' | 'budget_line' | 'ethics' | 'other';

export interface Snippet {
  _id: string;
  type: SnippetType;
  title: string;
  content: string;
  /** a populated team = shared with it; absent/null = personal */
  teamId?: { _id: string; name: string } | null;
  ownerId?: { _id: string; username?: string; firstName?: string; lastName?: string } | string;
  /** whether the signed-in user may change or delete it */
  canEdit: boolean;
  updatedAt: string;
}

export interface SnippetPayload {
  type: SnippetType;
  title: string;
  content: string;
  teamId?: string;
}

export const SNIPPET_TYPE_OPTIONS: { label: string; value: SnippetType }[] = [
  { label: 'Bio', value: 'bio' },
  { label: 'Institution', value: 'institution' },
  { label: 'Budget line', value: 'budget_line' },
  { label: 'Ethics', value: 'ethics' },
  { label: 'Other', value: 'other' },
];

export const SNIPPET_TYPE_LABEL: Record<SnippetType, string> = {
  bio: 'Bio',
  institution: 'Institution',
  budget_line: 'Budget line',
  ethics: 'Ethics',
  other: 'Other',
};
