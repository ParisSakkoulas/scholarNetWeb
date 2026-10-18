import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';

import { Profile } from '../../../core/models/profile.model';
import { Publication } from '../../../core/models/publication.model';
import { CitationStyle, formatCitation, typeHeading } from './citation';

export type CvSection =
  | 'summary'
  | 'experience'
  | 'education'
  | 'publications'
  | 'skills'
  | 'interests'
  | 'languages'
  | 'links';

export interface CvOptions {
  sections: Record<CvSection, boolean>;
  citationStyle: CitationStyle;
  groupBy: 'year' | 'type' | 'none';
  /** also list private and followers-only publications */
  includeNonPublic: boolean;
  showMetrics: boolean;
  /** the account email is private by default */
  showEmail: boolean;
  showLocation: boolean;
  showWebsite: boolean;
  showPhone: boolean;
}

export const CV_SECTIONS: { key: CvSection; label: string }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'experience', label: 'Experience' },
  { key: 'education', label: 'Education' },
  { key: 'publications', label: 'Publications' },
  { key: 'skills', label: 'Skills' },
  { key: 'interests', label: 'Research interests' },
  { key: 'languages', label: 'Languages' },
  { key: 'links', label: 'Links & identifiers' },
];

export const DEFAULT_CV_OPTIONS: CvOptions = {
  sections: {
    summary: true,
    experience: true,
    education: true,
    publications: true,
    skills: true,
    interests: true,
    languages: true,
    links: true,
  },
  citationStyle: 'apa',
  groupBy: 'year',
  includeNonPublic: false,
  showMetrics: true,
  showEmail: true,
  showLocation: true,
  showWebsite: true,
  showPhone: true,
};

const ACCENT = '#1d4ed8';
const MUTED = '#6b7280';

const month = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    : '';

function heading(text: string): Content {
  return {
    stack: [
      { text: text.toUpperCase(), style: 'sectionTitle' },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.8, lineColor: ACCENT }],
        margin: [0, 2, 0, 8],
      },
    ],
    unbreakable: true,
  };
}

function publicationList(pubs: Publication[], o: CvOptions): Content[] {
  const ieee = o.citationStyle === 'ieee';
  const entry = (p: Publication, n: number): Content =>
    ieee
      ? {
          columns: [
            { text: `[${n}]`, width: 28, color: MUTED },
            { text: formatCitation(p, o.citationStyle) as any },
          ],
          margin: [0, 0, 0, 5],
        }
      : { text: formatCitation(p, o.citationStyle) as any, margin: [0, 0, 0, 5] };

  // sort: newest first, then title
  const sorted = [...pubs].sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));

  if (o.groupBy === 'none') {
    return sorted.map((p, i) => entry(p, i + 1));
  }

  const groups = new Map<string, Publication[]>();
  for (const p of sorted) {
    const key = o.groupBy === 'year' ? String(p.year) : typeHeading(p);
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  let n = 0;
  const out: Content[] = [];
  for (const [label, items] of groups) {
    out.push({ text: label, style: 'groupTitle' });
    for (const p of items) out.push(entry(p, ++n));
  }
  return out;
}

/** Builds the pdfmake document for one person from what the profile and publications APIs return. */
export function buildCvDefinition(
  profile: Profile,
  publications: Publication[],
  o: CvOptions,
): TDocumentDefinitions {
  const u = profile.user;
  const fullName = `${u.firstName} ${u.lastName}`.trim();
  const place = [profile.city, profile.country].filter(Boolean).join(', ');
  const body: Content[] = [];

  // ---------- header ----------
  body.push({ text: fullName, style: 'name' });
  const current = profile.positions?.find((p) => p.current);
  const tagline =
    profile.headline ||
    (current ? `${current.title}, ${current.institution}` : '');
  if (tagline) body.push({ text: tagline, style: 'tagline' });

  const contact = [
    o.showLocation ? place : '',
    o.showEmail ? u.email : '',
    o.showPhone ? profile.phone : '',
    o.showWebsite ? profile.website : '',
    profile.orcidId ? `ORCID ${profile.orcidId}` : '',
  ].filter(Boolean);
  if (contact.length) {
    body.push({ text: contact.join('   •   '), color: MUTED, fontSize: 9.5, margin: [0, 4, 0, 0] });
  }
  if (o.showMetrics && (profile.hIndex || profile.i10Index || profile.citationCount)) {
    body.push({
      text: `h-index ${profile.hIndex ?? 0}   •   i10-index ${profile.i10Index ?? 0}   •   ${profile.citationCount ?? 0} citations`,
      color: MUTED,
      fontSize: 9.5,
      margin: [0, 2, 0, 0],
    });
  }
  body.push({ text: '', margin: [0, 6, 0, 0] });

  // ---------- sections ----------
  if (o.sections.summary && profile.bio?.trim()) {
    body.push(heading('Summary'), { text: profile.bio.trim(), alignment: 'justify', margin: [0, 0, 0, 14] });
  }

  if (o.sections.experience && profile.positions?.length) {
    body.push(heading('Experience'));
    const sorted = [...profile.positions].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );
    for (const p of sorted) {
      const range = `${month(p.startDate)} – ${p.current ? 'Present' : month(p.endDate) || ''}`;
      body.push({
        unbreakable: true,
        margin: [0, 0, 0, 8],
        stack: [
          {
            columns: [
              { text: p.title, bold: true },
              { text: range, alignment: 'right', color: MUTED, width: 'auto' },
            ],
          },
          {
            text: [p.institution, p.department].filter(Boolean).join(' — '),
            color: MUTED,
          },
        ],
      });
    }
    body.push({ text: '', margin: [0, 0, 0, 6] });
  }

  if (o.sections.education && profile.education?.length) {
    body.push(heading('Education'));
    const sorted = [...profile.education].sort(
      (a, b) => (b.endYear ?? 9999) - (a.endYear ?? 9999) || b.startYear - a.startYear,
    );
    for (const e of sorted) {
      body.push({
        unbreakable: true,
        margin: [0, 0, 0, 8],
        stack: [
          {
            columns: [
              {
                text: [e.degree, e.fieldOfStudy].filter(Boolean).join(', '),
                bold: true,
              },
              {
                text: `${e.startYear} – ${e.endYear ?? 'Present'}`,
                alignment: 'right',
                color: MUTED,
                width: 'auto',
              },
            ],
          },
          { text: e.institution, color: MUTED },
        ],
      });
    }
    body.push({ text: '', margin: [0, 0, 0, 6] });
  }

  if (o.sections.publications) {
    const pubs = publications.filter((p) => o.includeNonPublic || p.visibility === 'public');
    if (pubs.length) {
      body.push(heading(`Publications (${pubs.length})`), ...publicationList(pubs, o));
      body.push({ text: '', margin: [0, 0, 0, 8] });
    }
  }

  const simple = (title: string, items: string[]) => {
    if (items.length) {
      body.push(heading(title), { text: items.join('  •  '), margin: [0, 0, 0, 14] });
    }
  };
  if (o.sections.skills) simple('Skills', (profile.skills ?? []).map((s) => s.name));
  if (o.sections.interests) simple('Research interests', (profile.interests ?? []).map((i) => i.name));
  if (o.sections.languages) simple('Languages', profile.languages ?? []);

  if (o.sections.links) {
    const rows = [
      profile.orcidId && ['ORCID', `https://orcid.org/${profile.orcidId}`],
      profile.googleScholarId && ['Google Scholar', `https://scholar.google.com/citations?user=${profile.googleScholarId}`],
      profile.scopusId && ['Scopus', profile.scopusId],
      profile.researcherId && ['ResearcherID', profile.researcherId],
      profile.arxivId && ['arXiv', profile.arxivId],
      ...(profile.links ?? []).map((l) => [l.type, l.url]),
    ].filter(Boolean) as string[][];
    if (rows.length) {
      body.push(heading('Links & identifiers'));
      for (const [label, value] of rows) {
        body.push({
          columns: [
            { text: label, width: 100, color: MUTED },
            value.startsWith('http')
              ? { text: value, link: value, color: ACCENT }
              : { text: value },
          ],
          margin: [0, 0, 0, 3],
        });
      }
    }
  }

  return {
    info: { title: `${fullName} – CV`, author: fullName },
    pageSize: 'A4',
    pageMargins: [40, 48, 40, 50],
    defaultStyle: { font: 'Roboto', fontSize: 10.5, lineHeight: 1.25 },
    content: body,
    footer: (page, pages) => ({
      text: `${fullName} — ${page} / ${pages}`,
      alignment: 'center',
      color: MUTED,
      fontSize: 8.5,
      margin: [0, 16, 0, 0],
    }),
    styles: {
      name: { fontSize: 24, bold: true },
      tagline: { fontSize: 12.5, color: ACCENT, margin: [0, 2, 0, 0] },
      sectionTitle: { fontSize: 11.5, bold: true, color: ACCENT, characterSpacing: 0.6 },
      groupTitle: { bold: true, margin: [0, 6, 0, 4] },
    },
  };
}
