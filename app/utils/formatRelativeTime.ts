/**
 * Formats an ISO timestamp into a friendly, Lovable-style label shown under the project title,
 * e.g. "Today at 5:53 PM", "Yesterday at 9:01 AM" or "Mar 4 at 2:30 PM".
 */
export function formatRelativeTime(iso?: string): string {
  if (!iso) {
    return '';
  }

  const date = new Date(iso);

  if (isNaN(date.getTime())) {
    return '';
  }

  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  if (dayDiff === 0) {
    return `Today at ${time}`;
  }

  if (dayDiff === 1) {
    return `Yesterday at ${time}`;
  }

  const sameYear = date.getFullYear() === now.getFullYear();
  const dateLabel = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });

  return `${dateLabel} at ${time}`;
}
