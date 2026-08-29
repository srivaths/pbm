import type { DuesStatus, MembershipType } from '@/types';

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Whole days between a past ISO date (YYYY-MM-DD) and today, floored at 0. */
export function daysSinceDate(iso: string): number {
  const then = new Date(`${iso}T00:00:00`).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / 86_400_000));
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }) + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function membershipLabel(type: MembershipType): string {
  switch (type) {
    case 'admin':
      return 'Admin';
    case 'family':
      return 'Family';
    default:
      return 'Member';
  }
}

export function duesLabel(status: DuesStatus): { label: string; tone: 'good' | 'warn' | 'muted' } {
  switch (status) {
    case 'active':
      return { label: 'Dues paid', tone: 'good' };
    case 'past_due':
      return { label: 'Past due', tone: 'warn' };
    default:
      return { label: 'No dues', tone: 'muted' };
  }
}
