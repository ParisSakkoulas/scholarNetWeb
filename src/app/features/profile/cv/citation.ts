import {
  PUBLICATION_TYPE_LABEL,
  Publication,
} from '../../../core/models/publication.model';

export type CitationStyle = 'apa' | 'ieee';

/** A run of text for pdfmake; italics mark the journal / book / venue name. */
export interface CitationRun {
  text: string;
  italics?: boolean;
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

interface Name {
  last: string;
  initials: string;
}

/** "Jane Q. Doe" and "Doe, Jane Q." both become { last: "Doe", initials: "J. Q." } */
function parseName(full: string): Name {
  const clean = full.trim().replace(/\s+/g, ' ');
  let last: string;
  let given: string[];
  if (clean.includes(',')) {
    const [l, rest] = clean.split(',', 2);
    last = l.trim();
    given = rest.trim().split(' ').filter(Boolean);
  } else {
    const parts = clean.split(' ');
    last = parts.pop() ?? clean;
    given = parts;
  }
  const initials = given
    .flatMap((g) => g.split('-'))
    .map((g) => (g[0] ? `${g[0].toUpperCase()}.` : ''))
    .filter(Boolean)
    .join(' ');
  return { last, initials };
}

function authorsApa(names: string[]): string {
  const list = names.map(parseName).map((n) => (n.initials ? `${n.last}, ${n.initials}` : n.last));
  if (list.length <= 1) return list[0] ?? '';
  if (list.length > 20) return `${list.slice(0, 19).join(', ')}, ... ${list[list.length - 1]}`;
  return `${list.slice(0, -1).join(', ')}, & ${list[list.length - 1]}`;
}

function authorsIeee(names: string[]): string {
  const list = names.map(parseName).map((n) => (n.initials ? `${n.initials} ${n.last}` : n.last));
  if (list.length <= 1) return list[0] ?? '';
  if (list.length > 6) return `${list[0]} et al.`;
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}`;
}

/** Where it was published, per publication type. `container` is the part that gets italics. */
function venueParts(p: Publication): {
  container?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  extra?: string;
} {
  switch (p.type) {
    case 'journal_article':
      return {
        container: str(p['journalName']),
        volume: str(p['volume']),
        issue: str(p['issue']),
        pages: str(p['pages']) || str(p['articleNumber']),
      };
    case 'conference_paper':
      return {
        container: str(p['proceedingsTitle']) || str(p['conferenceName']),
        pages: str(p['pages']),
        extra: [str(p['conferenceName']) !== str(p['proceedingsTitle']) ? str(p['conferenceName']) : '', str(p['location'])]
          .filter(Boolean)
          .join(', '),
      };
    case 'book':
      return { extra: str(p['publisher']) };
    case 'book_chapter':
      return {
        container: `In ${str(p['bookTitle'])}`,
        pages: str(p['pages']),
        extra: str(p['publisher']),
      };
    case 'thesis':
      return {
        extra: [`${str(p['degree']).toUpperCase() || 'Thesis'} thesis`, str(p['institution'])]
          .filter(Boolean)
          .join(', '),
      };
    case 'technical_report':
      return {
        extra: [`Technical report${str(p['reportNumber']) ? ` ${str(p['reportNumber'])}` : ''}`, str(p['institution'])]
          .filter(Boolean)
          .join(', '),
      };
    case 'preprint':
      return { container: str(p['server']) || 'Preprint' };
    case 'dataset':
      return { extra: ['Dataset', str(p['repository'])].filter(Boolean).join(', ') };
    case 'patent':
      return {
        extra: [`Patent ${str(p['patentNumber'])}`.trim(), str(p['patentOffice'])]
          .filter(Boolean)
          .join(', '),
      };
    default:
      return { extra: str(p['customType']) || str(p['publisher']) || PUBLICATION_TYPE_LABEL[p.type] };
  }
}

/** Short "where it was published" line for lists, e.g. "Nature, 12(3), 45-60". */
export function venueLabel(p: Publication): string {
  const v = venueParts(p);
  const vol = v.volume ? `${v.volume}${v.issue ? `(${v.issue})` : ''}` : '';
  const main = [v.container, vol, v.pages].filter(Boolean).join(', ');
  return main || v.extra || '';
}

/** One formatted reference as pdfmake text runs. */
export function formatCitation(p: Publication, style: CitationStyle): CitationRun[] {
  const names = p.authors.map((a) => a.name);
  const v = venueParts(p);
  const doi = p.identifiers?.doi;
  const out: CitationRun[] = [];
  const add = (text: string, italics = false) => text && out.push({ text, italics });

  if (style === 'apa') {
    add(`${authorsApa(names)} (${p.year}). ${p.title.replace(/\.$/, '')}. `);
    if (v.container) {
      add(v.container, true);
      const vol = v.volume ? `, ${v.volume}${v.issue ? `(${v.issue})` : ''}` : '';
      const pages = v.pages ? `, ${v.pages}` : '';
      add(`${vol}${pages}. `);
    }
    if (v.extra) add(`${v.extra}. `);
    if (doi) add(`https://doi.org/${doi}`);
  } else {
    add(`${authorsIeee(names)}, “${p.title.replace(/\.$/, '')},” `);
    if (v.container) {
      add(v.container, true);
      const bits = [
        v.volume ? `vol. ${v.volume}` : '',
        v.issue ? `no. ${v.issue}` : '',
        v.pages ? `pp. ${v.pages}` : '',
      ].filter(Boolean);
      add(bits.length ? `, ${bits.join(', ')}` : '');
      add(`, ${p.year}.`);
    } else if (v.extra) {
      add(`${v.extra}, ${p.year}.`);
    } else {
      add(`${p.year}.`);
    }
    if (doi) add(` doi: ${doi}`);
  }
  return out.length ? out : [{ text: p.title }];
}

/** Used by the builder when grouping by type. */
export const typeHeading = (p: Publication): string => PUBLICATION_TYPE_LABEL[p.type] ?? p.type;
