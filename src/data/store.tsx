import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import type {
  Booking,
  DuesStatus,
  EventInstance,
  EventTemplate,
  Member,
  MemberStatus,
  MembershipType,
  RatingEntry,
  RatingSource,
  SkillLevel,
} from '@/types';

export type Club = { id: string; name: string; graceDays: number };

export type RatingInput = {
  rating: number;
  source: RatingSource;
  asOf: string; // ISO date
  note: string | null;
};

// Attendance derived from bookings (confirmed on past vs future sessions).
export type Attendance = { attended: number; upcoming: number };

export type InstanceStatus = {
  confirmedCount: number;
  waitlistCount: number;
  capacity: number;
  openSlots: number;
  isFull: boolean;
  myBooking: Booking | null;
};

// Admin write payloads (camelCase; mapped to snake_case columns on write).
export type EventInput = {
  title: string;
  durationMin: number;
  skillLevel: SkillLevel;
  instructor: string | null;
};
export type InstanceInput = {
  eventId: string;
  startsAt: string; // ISO timestamp
  capacity: number;
};
export type MemberInput = {
  name: string;
  email: string;
  membershipType: MembershipType;
  skillRating: number;
  duesStatus: DuesStatus;
};

type StoreValue = {
  loading: boolean;
  error: string | null;
  club: Club | null;
  members: Member[];
  events: EventTemplate[];
  instances: EventInstance[];
  bookings: Booking[];
  ratingHistory: RatingEntry[];
  currentMemberId: string | null;
  isAdmin: boolean;
  statusFor: (instanceId: string) => InstanceStatus;
  ratingsFor: (memberId: string) => RatingEntry[];
  attendanceFor: (memberId: string) => Attendance;
  // Resolve to an error message string, or null on success.
  book: (instanceId: string) => Promise<string | null>;
  cancel: (instanceId: string) => Promise<string | null>;
  // Admin removes any member's booking (triggers waitlist auto-promote).
  adminCancelBooking: (instanceId: string, memberId: string) => Promise<string | null>;
  // Admin-only writes. Resolve to an error message string, or null on success.
  createEvent: (input: EventInput) => Promise<string | null>;
  updateEvent: (id: string, input: EventInput) => Promise<string | null>;
  deleteEvent: (id: string) => Promise<string | null>;
  createInstance: (input: InstanceInput) => Promise<string | null>;
  deleteInstance: (id: string) => Promise<string | null>;
  createMember: (input: MemberInput) => Promise<string | null>;
  updateMember: (id: string, input: MemberInput) => Promise<string | null>;
  deleteMember: (id: string) => Promise<string | null>;
  setMemberStatus: (id: string, status: MemberStatus) => Promise<string | null>;
  addRating: (memberId: string, input: RatingInput) => Promise<string | null>;
  updateGraceDays: (days: number) => Promise<string | null>;
  refresh: () => Promise<void>;
};

const StoreContext = createContext<StoreValue | null>(null);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Right after sign-in, a just-minted token can look "issued in the future" to the
// database replica for a moment (sub-second auth/replica clock skew). These calls
// succeed on a quick retry, so we treat them as transient rather than real errors.
function isTransientAuthError(message?: string | null): boolean {
  if (!message) return false;
  return /issued at future|not yet valid|before the .* claim|\biat\b|\bnbf\b/i.test(message);
}

// Runs a Supabase call, retrying a few times (with backoff) only on the transient
// clock-skew error above. Returns the final result either way.
async function withAuthRetry<T extends { error: any }>(run: () => Promise<T>): Promise<T> {
  const maxAttempts = 4;
  let result = await run();
  for (let attempt = 1; attempt < maxAttempts && isTransientAuthError(result.error?.message); attempt++) {
    await sleep(attempt * 700);
    result = await run();
  }
  return result;
}

// ---- DB row -> app type mappers ----
function toMember(r: any): Member {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    membershipType: r.membership_type,
    skillRating: Number(r.skill_rating),
    duesStatus: r.dues_status,
    status: r.status ?? 'active',
    pastDueSince: r.past_due_since ?? null,
    joinedAt: r.joined_at,
  };
}
function toRating(r: any): RatingEntry {
  return {
    id: r.id,
    memberId: r.member_id,
    rating: Number(r.rating),
    source: r.source,
    asOf: r.as_of,
    note: r.note ?? null,
  };
}
function toEvent(r: any): EventTemplate {
  return {
    id: r.id,
    title: r.title,
    durationMin: r.duration_min,
    skillLevel: r.skill_level as SkillLevel,
    instructor: r.instructor ?? null,
  };
}
function toInstance(r: any): EventInstance {
  return { id: r.id, eventId: r.event_id, startsAt: r.starts_at, capacity: r.capacity };
}
function toBooking(r: any): Booking {
  return {
    id: r.id,
    instanceId: r.instance_id,
    memberId: r.member_id,
    status: r.status,
    createdAt: r.created_at,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { userId, configured } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<EventTemplate[]>([]);
  const [instances, setInstances] = useState<EventInstance[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ratingHistory, setRatingHistory] = useState<RatingEntry[]>([]);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!configured || !userId) return;
    setError(null);
    try {
      const { data: results, error: batchError } = await withAuthRetry(async () => {
        const [clubsRes, membersRes, eventsRes, instancesRes, bookingsRes, ratingsRes] = await Promise.all([
          supabase.from('clubs').select('*').limit(1).maybeSingle(),
          supabase.from('members').select('*'),
          supabase.from('events').select('*'),
          supabase.from('event_instances').select('*'),
          supabase.from('bookings').select('*'),
          supabase.from('member_rating_history').select('*'),
        ]);
        const error =
          clubsRes.error ||
          membersRes.error ||
          eventsRes.error ||
          instancesRes.error ||
          bookingsRes.error ||
          ratingsRes.error;
        return { data: { clubsRes, membersRes, eventsRes, instancesRes, bookingsRes, ratingsRes }, error };
      });
      if (batchError) throw batchError;
      const { clubsRes, membersRes, eventsRes, instancesRes, bookingsRes, ratingsRes } = results;

      const memberRows = membersRes.data ?? [];
      // The current user's own member row is the one linked to their auth id.
      const mine = memberRows.find((m: any) => m.user_id === userId);
      setCurrentMemberId(mine ? mine.id : null);

      setClub(
        clubsRes.data
          ? { id: clubsRes.data.id, name: clubsRes.data.name, graceDays: clubsRes.data.grace_days ?? 14 }
          : null,
      );
      setMembers(memberRows.map(toMember));
      setEvents((eventsRes.data ?? []).map(toEvent));
      setInstances((instancesRes.data ?? []).map(toInstance));
      setBookings((bookingsRes.data ?? []).map(toBooking));
      setRatingHistory((ratingsRes.data ?? []).map(toRating));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load club data');
    }
  }, [configured, userId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [load]);

  const statusFor = useCallback(
    (instanceId: string): InstanceStatus => {
      const forInstance = bookings.filter((b) => b.instanceId === instanceId);
      const confirmed = forInstance.filter((b) => b.status === 'confirmed');
      const waitlisted = forInstance.filter((b) => b.status === 'waitlisted');
      const capacity = instances.find((i) => i.id === instanceId)?.capacity ?? 0;
      const openSlots = Math.max(0, capacity - confirmed.length);
      const myBooking =
        (currentMemberId && forInstance.find((b) => b.memberId === currentMemberId)) || null;
      return {
        confirmedCount: confirmed.length,
        waitlistCount: waitlisted.length,
        capacity,
        openSlots,
        isFull: openSlots === 0,
        myBooking,
      };
    },
    [bookings, instances, currentMemberId],
  );

  const book = useCallback(
    async (instanceId: string): Promise<string | null> => {
      const { error } = await withAuthRetry(async () =>
        supabase.rpc('book_slot', { p_instance_id: instanceId }),
      );
      if (error) return error.message;
      await load();
      return null;
    },
    [load],
  );

  const cancel = useCallback(
    async (instanceId: string): Promise<string | null> => {
      const { error } = await withAuthRetry(async () =>
        supabase.rpc('cancel_booking', { p_instance_id: instanceId }),
      );
      if (error) return error.message;
      await load();
      return null;
    },
    [load],
  );

  const ratingsFor = useCallback(
    (memberId: string): RatingEntry[] =>
      ratingHistory.filter((r) => r.memberId === memberId).sort((a, b) => b.asOf.localeCompare(a.asOf)),
    [ratingHistory],
  );

  const attendanceFor = useCallback(
    (memberId: string): Attendance => {
      const now = new Date().toISOString();
      let attended = 0;
      let upcoming = 0;
      for (const b of bookings) {
        if (b.memberId !== memberId || b.status !== 'confirmed') continue;
        const startsAt = instances.find((i) => i.id === b.instanceId)?.startsAt;
        if (!startsAt) continue;
        if (startsAt < now) attended += 1;
        else upcoming += 1;
      }
      return { attended, upcoming };
    },
    [bookings, instances],
  );

  const isAdmin = useMemo(
    () => members.some((m) => m.id === currentMemberId && m.membershipType === 'admin'),
    [members, currentMemberId],
  );

  const adminCancelBooking = useCallback(
    async (instanceId: string, memberId: string): Promise<string | null> => {
      const { error } = await withAuthRetry(async () =>
        supabase.rpc('admin_cancel_booking', { p_instance_id: instanceId, p_member_id: memberId }),
      );
      if (error) return error.message;
      await load();
      return null;
    },
    [load],
  );

  const createEvent = useCallback(
    async (input: EventInput): Promise<string | null> => {
      if (!club) return 'No club loaded yet.';
      const { error } = await withAuthRetry(async () =>
        supabase.from('events').insert({
          club_id: club.id,
          title: input.title,
          duration_min: input.durationMin,
          skill_level: input.skillLevel,
          instructor: input.instructor,
        }),
      );
      if (error) return error.message;
      await load();
      return null;
    },
    [club, load],
  );

  const updateEvent = useCallback(
    async (id: string, input: EventInput): Promise<string | null> => {
      const { error } = await withAuthRetry(async () =>
        supabase
          .from('events')
          .update({
            title: input.title,
            duration_min: input.durationMin,
            skill_level: input.skillLevel,
            instructor: input.instructor,
          })
          .eq('id', id),
      );
      if (error) return error.message;
      await load();
      return null;
    },
    [load],
  );

  const deleteEvent = useCallback(
    async (id: string): Promise<string | null> => {
      const { error } = await withAuthRetry(async () => supabase.from('events').delete().eq('id', id));
      if (error) return error.message;
      await load();
      return null;
    },
    [load],
  );

  const createInstance = useCallback(
    async (input: InstanceInput): Promise<string | null> => {
      const { error } = await withAuthRetry(async () =>
        supabase.from('event_instances').insert({
          event_id: input.eventId,
          starts_at: input.startsAt,
          capacity: input.capacity,
        }),
      );
      if (error) return error.message;
      await load();
      return null;
    },
    [load],
  );

  const deleteInstance = useCallback(
    async (id: string): Promise<string | null> => {
      const { error } = await withAuthRetry(async () =>
        supabase.from('event_instances').delete().eq('id', id),
      );
      if (error) return error.message;
      await load();
      return null;
    },
    [load],
  );

  const createMember = useCallback(
    async (input: MemberInput): Promise<string | null> => {
      if (!club) return 'No club loaded yet.';
      const { error } = await withAuthRetry(async () =>
        supabase.from('members').insert({
          club_id: club.id,
          name: input.name,
          email: input.email,
          membership_type: input.membershipType,
          skill_rating: input.skillRating,
          dues_status: input.duesStatus,
        }),
      );
      if (error) return error.message;
      await load();
      return null;
    },
    [club, load],
  );

  const updateMember = useCallback(
    async (id: string, input: MemberInput): Promise<string | null> => {
      // Guard against an admin accidentally removing their own admin access and
      // locking themselves out of the admin tools.
      if (id === currentMemberId && input.membershipType !== 'admin') {
        return "You can't remove your own admin role.";
      }
      const { error } = await withAuthRetry(async () =>
        supabase
          .from('members')
          .update({
            name: input.name,
            email: input.email,
            membership_type: input.membershipType,
            skill_rating: input.skillRating,
            dues_status: input.duesStatus,
          })
          .eq('id', id),
      );
      if (error) return error.message;
      await load();
      return null;
    },
    [load, currentMemberId],
  );

  const deleteMember = useCallback(
    async (id: string): Promise<string | null> => {
      const { error } = await withAuthRetry(async () => supabase.from('members').delete().eq('id', id));
      if (error) return error.message;
      await load();
      return null;
    },
    [load],
  );

  const setMemberStatus = useCallback(
    async (id: string, status: MemberStatus): Promise<string | null> => {
      if (id === currentMemberId && status === 'suspended') {
        return "You can't suspend your own account.";
      }
      const { error } = await withAuthRetry(async () =>
        supabase.rpc('admin_set_member_status', { p_member_id: id, p_status: status }),
      );
      if (error) return error.message;
      await load();
      return null;
    },
    [load, currentMemberId],
  );

  const addRating = useCallback(
    async (memberId: string, input: RatingInput): Promise<string | null> => {
      const { error } = await withAuthRetry(async () =>
        supabase.from('member_rating_history').insert({
          member_id: memberId,
          rating: input.rating,
          source: input.source,
          as_of: input.asOf,
          note: input.note,
        }),
      );
      if (error) return error.message;
      await load();
      return null;
    },
    [load],
  );

  const updateGraceDays = useCallback(
    async (days: number): Promise<string | null> => {
      if (!club) return 'No club loaded yet.';
      const { error } = await withAuthRetry(async () =>
        supabase.from('clubs').update({ grace_days: days }).eq('id', club.id),
      );
      if (error) return error.message;
      await load();
      return null;
    },
    [club, load],
  );

  const value = useMemo<StoreValue>(
    () => ({
      loading,
      error,
      club,
      members,
      events,
      instances,
      bookings,
      ratingHistory,
      currentMemberId,
      isAdmin,
      statusFor,
      ratingsFor,
      attendanceFor,
      book,
      cancel,
      adminCancelBooking,
      createEvent,
      updateEvent,
      deleteEvent,
      createInstance,
      deleteInstance,
      createMember,
      updateMember,
      deleteMember,
      setMemberStatus,
      addRating,
      updateGraceDays,
      refresh: load,
    }),
    [
      loading,
      error,
      club,
      members,
      events,
      instances,
      bookings,
      ratingHistory,
      currentMemberId,
      isAdmin,
      statusFor,
      ratingsFor,
      attendanceFor,
      book,
      cancel,
      adminCancelBooking,
      createEvent,
      updateEvent,
      deleteEvent,
      createInstance,
      deleteInstance,
      createMember,
      updateMember,
      deleteMember,
      setMemberStatus,
      addRating,
      updateGraceDays,
      load,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}
