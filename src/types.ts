// Domain model for the Pickleball Club Manager.
// Mirrors docs/REQUIREMENTS.md. Kept deliberately small for the v1 shell.

export type SkillLevel = '2.0' | '2.5' | '3.0' | '3.5' | '4.0' | '4.5' | '5.0' | 'Any';

export type MembershipType = 'admin' | 'generic' | 'family';

export type DuesStatus = 'active' | 'past_due' | 'none';

// Roster lifecycle, separate from dues. Suspended keeps the row + history.
export type MemberStatus = 'active' | 'suspended';

export type Member = {
  id: string;
  name: string;
  email: string;
  membershipType: MembershipType;
  skillRating: number; // e.g. 3.5 — coarse band used for event matching
  duesStatus: DuesStatus;
  status: MemberStatus;
  pastDueSince: string | null; // ISO date the member went past due, else null
  joinedAt: string; // ISO date
};

export type RatingSource = 'DUPR' | 'self' | 'admin';

// A point-in-time rating snapshot (e.g. DUPR as of a date).
export type RatingEntry = {
  id: string;
  memberId: string;
  rating: number;
  source: RatingSource;
  asOf: string; // ISO date
  note: string | null;
};

export type EventTemplate = {
  id: string;
  title: string;
  durationMin: number;
  skillLevel: SkillLevel;
  instructor: string | null; // null => "None"
};

export type EventInstance = {
  id: string;
  eventId: string;
  startsAt: string; // ISO datetime
  capacity: number;
};

export type BookingStatus = 'confirmed' | 'waitlisted';

export type Booking = {
  id: string;
  instanceId: string;
  memberId: string;
  status: BookingStatus;
  createdAt: string; // ISO datetime — also used to order the waitlist
};
