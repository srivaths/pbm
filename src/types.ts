// Domain model for the Pickleball Club Manager.
// Mirrors docs/REQUIREMENTS.md. Kept deliberately small for the v1 shell.

export type SkillLevel = '2.0' | '2.5' | '3.0' | '3.5' | '4.0' | '4.5' | '5.0' | 'Any';

export type MembershipType = 'admin' | 'generic' | 'family';

export type DuesStatus = 'active' | 'past_due' | 'none';

export type Member = {
  id: string;
  name: string;
  email: string;
  membershipType: MembershipType;
  skillRating: number; // e.g. 3.5
  duesStatus: DuesStatus;
  joinedAt: string; // ISO date
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
