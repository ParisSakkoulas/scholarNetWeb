/** "Just now", "5m ago", "3h ago", "2d ago", then a short date. */
export function timeAgo(date: string | Date): string {
  const seconds = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  const units: [number, string][] = [
    [60 * 60 * 24, 'd'],
    [60 * 60, 'h'],
    [60, 'm'],
  ];
  if (seconds >= 60 * 60 * 24 * 7) {
    return new Date(date).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  for (const [size, label] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`;
  }
  return 'Just now';
}
