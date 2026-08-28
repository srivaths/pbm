import type { Booking, EventInstance, EventTemplate, Member } from '@/types';

// ---- Club ----
export const CLUB = {
  id: 'club_dinkers',
  name: 'Riverside Dinkers',
};

// The signed-in member for this demo (a self-serve generic member).
export const CURRENT_MEMBER_ID = 'm_you';

// ---- Members ----
export const MEMBERS: Member[] = [
  {
    id: 'm_you',
    name: 'You (demo)',
    email: 'you@example.com',
    membershipType: 'generic',
    skillRating: 3.5,
    duesStatus: 'active',
    joinedAt: '2025-01-15',
  },
  {
    id: 'm_ana',
    name: 'Ana Rivera',
    email: 'ana@example.com',
    membershipType: 'admin',
    skillRating: 4.5,
    duesStatus: 'active',
    joinedAt: '2024-03-02',
  },
  {
    id: 'm_ben',
    name: 'Ben Cho',
    email: 'ben@example.com',
    membershipType: 'generic',
    skillRating: 3.0,
    duesStatus: 'past_due',
    joinedAt: '2025-06-20',
  },
  {
    id: 'm_carmen',
    name: 'Carmen Diaz',
    email: 'carmen@example.com',
    membershipType: 'family',
    skillRating: 4.0,
    duesStatus: 'active',
    joinedAt: '2024-11-11',
  },
  {
    id: 'm_dev',
    name: 'Dev Patel',
    email: 'dev@example.com',
    membershipType: 'generic',
    skillRating: 2.5,
    duesStatus: 'none',
    joinedAt: '2025-08-01',
  },
  {
    id: 'm_ella',
    name: 'Ella Novak',
    email: 'ella@example.com',
    membershipType: 'family',
    skillRating: 3.5,
    duesStatus: 'active',
    joinedAt: '2025-02-28',
  },
];

// ---- Event templates ----
export const EVENTS: EventTemplate[] = [
  {
    id: 'e_open',
    title: 'Open Play',
    durationMin: 120,
    skillLevel: 'Any',
    instructor: null,
  },
  {
    id: 'e_beginner',
    title: 'Beginner Clinic',
    durationMin: 60,
    skillLevel: '2.5',
    instructor: 'Coach Ana',
  },
  {
    id: 'e_intermediate',
    title: 'Intermediate Drills',
    durationMin: 90,
    skillLevel: '3.5',
    instructor: 'Coach Ana',
  },
  {
    id: 'e_advanced',
    title: 'Advanced Strategy',
    durationMin: 90,
    skillLevel: '4.5',
    instructor: 'Coach Marco',
  },
];

// ---- Scheduled instances ----
// Dates are generated relative to "now" so the schedule always looks upcoming.
function inDays(days: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const EVENT_INSTANCES: EventInstance[] = [
  { id: 'i_open_1', eventId: 'e_open', startsAt: inDays(1, 9), capacity: 12 },
  { id: 'i_beg_1', eventId: 'e_beginner', startsAt: inDays(1, 17), capacity: 4 },
  { id: 'i_int_1', eventId: 'e_intermediate', startsAt: inDays(2, 18), capacity: 6 },
  { id: 'i_adv_1', eventId: 'e_advanced', startsAt: inDays(3, 18), capacity: 4 },
  { id: 'i_open_2', eventId: 'e_open', startsAt: inDays(5, 9), capacity: 12 },
];

// ---- Seed bookings ----
// The intermediate session is intentionally near-full and the beginner clinic is
// FULL with a waitlist, so "join waitlist" and auto-promote are demonstrable.
export const SEED_BOOKINGS: Booking[] = [
  // Beginner clinic (capacity 4) -> full
  { id: 'b1', instanceId: 'i_beg_1', memberId: 'm_ben', status: 'confirmed', createdAt: inDays(-2, 10) },
  { id: 'b2', instanceId: 'i_beg_1', memberId: 'm_carmen', status: 'confirmed', createdAt: inDays(-2, 11) },
  { id: 'b3', instanceId: 'i_beg_1', memberId: 'm_dev', status: 'confirmed', createdAt: inDays(-2, 12) },
  { id: 'b4', instanceId: 'i_beg_1', memberId: 'm_you', status: 'confirmed', createdAt: inDays(-1, 9) },
  { id: 'b5', instanceId: 'i_beg_1', memberId: 'm_ana', status: 'waitlisted', createdAt: inDays(-1, 10) },
  // Intermediate drills (capacity 6) -> 5 taken, 1 open
  { id: 'b6', instanceId: 'i_int_1', memberId: 'm_ana', status: 'confirmed', createdAt: inDays(-2, 9) },
  { id: 'b7', instanceId: 'i_int_1', memberId: 'm_carmen', status: 'confirmed', createdAt: inDays(-2, 10) },
  { id: 'b8', instanceId: 'i_int_1', memberId: 'm_ella', status: 'confirmed', createdAt: inDays(-2, 11) },
  { id: 'b9', instanceId: 'i_int_1', memberId: 'm_ben', status: 'confirmed', createdAt: inDays(-1, 8) },
  { id: 'b10', instanceId: 'i_int_1', memberId: 'm_dev', status: 'confirmed', createdAt: inDays(-1, 9) },
];
