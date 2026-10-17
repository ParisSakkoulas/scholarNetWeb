export const linkTypeOptions = [
  { label: 'Website', value: 'website' },
  { label: 'GitHub', value: 'github' },
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'Twitter / X', value: 'twitter' },
  { label: 'ResearchGate', value: 'researchgate' },
  { label: 'Other', value: 'other' },
];

const LINK_ICONS: Record<string, string> = {
  website: 'pi pi-globe',
  github: 'pi pi-github',
  linkedin: 'pi pi-linkedin',
  twitter: 'pi pi-twitter',
  researchgate: 'pi pi-share-alt',
  other: 'pi pi-link',
};

export function linkIcon(type: string): string {
  return LINK_ICONS[type] ?? 'pi pi-link';
}

export function linkLabel(type: string): string {
  return linkTypeOptions.find((o) => o.value === type)?.label ?? type;
}
