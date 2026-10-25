/** The same author always gets the same colour; comment cards and the editor highlights share this index. */
export const AUTHOR_COLOR_COUNT = 6;

export function authorColorIndex(authorId: string | null | undefined): number {
  const id = String(authorId ?? '');
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % AUTHOR_COLOR_COUNT;
}
