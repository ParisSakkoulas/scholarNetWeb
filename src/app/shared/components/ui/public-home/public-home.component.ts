import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-public-home',
  standalone: true,
  imports: [RouterLink, ButtonModule, TagModule, AvatarModule],
  templateUrl: './public-home.component.html',
})
export class PublicHomeComponent {
  readonly stats = [
    { value: '24', unit: 'k', label: 'Researchers · 142 institutions' },
    { value: '1.8', unit: 'M', label: 'Publications indexed' },
    { value: '94', unit: '%', label: 'Metadata auto-resolved' },
  ];

  readonly previewStats = [
    { value: '47', label: 'Publications' },
    { value: '2,140', label: 'Citations' },
    { value: '14', label: 'h-index' },
  ];

  readonly previewPubs = [
    {
      title: 'On the Convergence of Federated Optimisation under Non-IID Data',
      authors: 'A. Yılmaz, R. Okafor, M. Lindgren',
      venue: 'JMLR',
      year: 2025,
      cites: 412,
    },
    {
      title: 'Sparse Attention for Long-Context Citation Graphs',
      authors: 'M. Lindgren, H. Cho',
      venue: 'NeurIPS',
      year: 2024,
      cites: 318,
    },
    {
      title: "A Practitioner's Guide to Reproducible ML Pipelines",
      authors: 'M. Lindgren et al.',
      venue: 'ICLR Workshop',
      year: 2024,
      cites: 102,
    },
  ];

  readonly universities = [
    'ETH Zürich',
    'KTH Stockholm',
    'TU Delft',
    'University of Edinburgh',
    'Boğaziçi University',
    'UC Berkeley',
  ];

  readonly features = [
    {
      icon: 'pi pi-book',
      title: 'Publications, auto-synced',
      text: 'Paste a DOI, arXiv ID, or URL and scholarNet pulls the authors, abstract, venue, and citation count from trusted sources. Connect ORCID once and new papers appear on their own.',
      figure: {
        title: 'Sources resolved',
        rows: [
          { key: 'CrossRef', value: 'DOI · authors · venue' },
          { key: 'arXiv', value: 'preprint · pdf · revisions' },
          { key: 'ORCID', value: 'identity verification' },
          { key: 'OpenAlex', value: 'citation graph' },
        ],
      },
    },
    {
      icon: 'pi pi-lock',
      title: 'Materials, shared precisely',
      text: 'Upload slides, datasets, and pre-prints with per-file access controls. Make something public, require approval, or keep it to yourself: the same upload, three different audiences.',
      figure: {
        title: 'Access controls',
        rows: [
          { key: 'Public', value: 'anyone who can see the publication' },
          { key: 'On request', value: 'you approve each person' },
          { key: 'Only me', value: 'just you' },
          { key: 'Embargo', value: 'locked until a date you choose' },
        ],
      },
    },
    {
      icon: 'pi pi-users',
      title: 'Colleagues, one degree away',
      text: 'Follow your co-authors, your committee, your reading list. Endorse skills, surface common interests, and find the right person for a review, without the engagement metrics.',
      figure: {
        title: 'Discovery surface',
        rows: [
          { key: 'Co-authors', value: 'direct collaborations' },
          { key: 'Citations', value: 'who cites whom' },
          { key: 'Skills', value: 'peer-endorsed expertise' },
          { key: 'Messages', value: 'chat with your connections' },
        ],
      },
    },
    {
      icon: 'pi pi-id-card',
      title: 'A profile worth linking to',
      text: 'Every researcher gets a clean, public page: bio, affiliations, publications, materials, and contacts. One URL for your CV, your grant application, your lab’s website.',
      figure: {
        title: 'Profile surface',
        rows: [
          { key: 'Sections', value: 'bio · pubs · education · skills' },
          { key: 'Privacy', value: 'choose who sees contact details' },
          { key: 'Export', value: 'PDF CV with your publications' },
          { key: 'Citations', value: 'APA or IEEE formatting' },
        ],
      },
    },
  ];

  readonly steps = [
    {
      title: 'Connect your identifiers',
      text: 'Add your ORCID, arXiv, Google Scholar or Scopus IDs. We use these to find your work, never to post on your behalf.',
      lines: ['ORCID ········ connected', 'arXiv ········· connected', 'Scholar ······ connected'],
    },
    {
      title: 'Confirm your publications',
      text: 'Add each publication by hand or import its references from BibTeX or OpenAlex. Co-authors are linked when they are on the network.',
      lines: ['47 publications', '2 duplicates merged', '12 co-authors linked'],
    },
    {
      title: 'Share what you choose',
      text: 'Attach slides, posters, and pre-prints with the access level you want. Write a one-line bio and your page is ready to link from anywhere.',
      lines: ['16 files uploaded', '3 access requests', 'status ······ public'],
    },
  ];

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
