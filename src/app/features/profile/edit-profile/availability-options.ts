export const availabilityOptions = [
  { label: 'Available for collaboration', value: 'collaboration' },
  { label: 'Available for supervision', value: 'supervision' },
  { label: 'Open to consulting', value: 'consulting' },
  { label: 'Open to reviews', value: 'reviews' },
  { label: 'Open to talks', value: 'talks' },
  { label: 'Not currently available', value: 'unavailable' },
];

export function availabilityLabel(value: string): string {
  return availabilityOptions.find((o) => o.value === value)?.label ?? value;
}
