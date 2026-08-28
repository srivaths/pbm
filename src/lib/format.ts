import type { DuesStatus, MembershipType } from '@/types';

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
