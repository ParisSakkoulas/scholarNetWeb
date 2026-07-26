// core/models/profile-view.model.ts
//
// View-model types for content the profile page displays but doesn't own.
// Publications live in the publications module, materials in the files
// module — each keeps its own domain model. These are the shapes the
// profile card layout actually needs; small adapter functions in
// profile.component.ts map the real Publication / FileItem entities into
// these once, so the same row/card markup can render content from any
// source without the component caring where it came from.

export interface PublicationBadge {
    label: string;
    variant?: 'green' | 'oa' | 'default';
}

export interface PublicationListItem {
    _id: string;
    year: number;
    title: string;
    authorLine: string;     // pre-formatted, owner's name wrapped in <b> by the adapter
    venue: string;
    venueDetail?: string;    // 'vol. 26, pp. 1–48' | 'oral · top 3 %'
    doi?: string;
    badges: PublicationBadge[];
    citationCount: number;
}

export type MaterialKind = 'slides' | 'code' | 'data' | 'poster';

export interface ProfileMaterial {
    _id: string;
    kind: MaterialKind;
    access: string;          // 'public' | 'network' | 'group · KTH lab'
    title: string;
    meta: string;             // 'PDF · 48 slides · 6.2 MB'
    statIcon: '↓' | '★' | '↗';
    statLabel: string;        // 'downloads' | 'stars' | 'uses'
    statValue: string;
    date: string;
}

/** One bar in the citation-history chart — built by zipping
 *  Profile.yearlyPublications and Profile.yearlyCitations by year. */
export interface YearlyMetric {
    year: number;
    citations: number;
    publications: number;
    citationPct: number;
    publicationPct: number;
    isPeak?: boolean;
}

/** Shared row shape for any "year(s) · institution · role" timeline —
 *  used for both the Affiliations and Education side-blocks so the
 *  markup/CSS only has to exist once. */
export interface TimelineEntry {
    _id: string;
    yearRange: string;     // pre-formatted via formatYearRange()
    name: string;
    detail: string;
}

/** One tile in the stats strip — built client-side from the primitive
 *  counters on Profile (avoids the rigid 6-stat shape leaking into the API). */
export interface ProfileStat {
    value: string;
    label: string;
    detail?: string;
    detailEmphasis?: boolean;
}