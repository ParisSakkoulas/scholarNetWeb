import type { Node as PMNode } from '@tiptap/pm/model';

/**
 * A comment on an editor document points at the text it was written about: the selected range
 * plus the quoted text. Comments are stored apart from the document (the student is the only
 * writer, so nothing may modify the document from outside), so after the student edits, the
 * range can be stale. The quote is how we find the text again; when it is gone the comment is
 * "outdated" but never lost.
 */
export interface TextAnchor {
  from: number;
  to: number;
  quote: string;
  /** a little text before and after the quote, to tell repeated phrases apart after edits */
  before?: string;
  after?: string;
}

const MAX_QUOTE = 500;
const CONTEXT = 30;

interface Flat {
  text: string;
  /** map[i] is the document position of character i, or -1 for the line break between blocks */
  map: number[];
}

function flatten(doc: PMNode): Flat {
  let text = '';
  const map: number[] = [];
  doc.descendants((node, pos) => {
    if (node.isTextblock && text.length) {
      text += '\n';
      map.push(-1);
    }
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        text += node.text[i];
        map.push(pos + i);
      }
    }
    return true;
  });
  return { text, map };
}

/** Index range [i0, i1] of the characters inside document range [from, to), trimmed of whitespace. */
function indexRange(flat: Flat, from: number, to: number): [number, number] | null {
  let i0 = -1;
  let i1 = -1;
  for (let i = 0; i < flat.map.length; i++) {
    const p = flat.map[i];
    if (p >= from && p < to) {
      if (i0 === -1) i0 = i;
      i1 = i;
    }
  }
  if (i0 === -1) return null;
  while (i0 <= i1 && /\s/.test(flat.text[i0])) i0++;
  while (i1 >= i0 && /\s/.test(flat.text[i1])) i1--;
  return i0 <= i1 ? [i0, i1] : null;
}

export function anchorFromSelection(doc: PMNode, from: number, to: number): TextAnchor | null {
  const flat = flatten(doc);
  const range = indexRange(flat, from, to);
  if (!range) return null;
  const [i0, i1] = range;
  const quote = flat.text.slice(i0, i1 + 1).slice(0, MAX_QUOTE);
  const end = i0 + quote.length;
  return {
    from: flat.map[i0],
    to: flat.map[end - 1] + 1,
    quote,
    before: flat.text.slice(Math.max(0, i0 - CONTEXT), i0),
    after: flat.text.slice(end, end + CONTEXT),
  };
}

/** Where the anchor is now, or null when its text no longer exists (outdated). */
export function resolveAnchor(doc: PMNode, anchor: TextAnchor): { from: number; to: number } | null {
  if (!anchor.quote) return null;
  const flat = flatten(doc);

  // unchanged: the text at the stored range is still the quote
  const range = indexRange(flat, anchor.from, anchor.to);
  if (range && flat.text.slice(range[0], range[1] + 1) === anchor.quote) {
    return { from: anchor.from, to: anchor.to };
  }

  // moved: among the occurrences of the quote, prefer the one with the same surrounding text,
  // then the one nearest to where it used to be
  let best = -1;
  let bestScore = -1;
  let bestDistance = Infinity;
  for (let at = flat.text.indexOf(anchor.quote); at !== -1; at = flat.text.indexOf(anchor.quote, at + 1)) {
    const end = at + anchor.quote.length;
    const score =
      commonSuffix(flat.text.slice(Math.max(0, at - CONTEXT), at), anchor.before ?? '') +
      commonPrefix(flat.text.slice(end, end + CONTEXT), anchor.after ?? '');
    const d = Math.abs(flat.map[at] - anchor.from);
    if (score > bestScore || (score === bestScore && d < bestDistance)) {
      best = at;
      bestScore = score;
      bestDistance = d;
    }
  }
  if (best === -1) return null;
  return { from: flat.map[best], to: flat.map[best + anchor.quote.length - 1] + 1 };
}

function commonPrefix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

function commonSuffix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
  return i;
}
