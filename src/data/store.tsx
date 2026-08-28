import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { CURRENT_MEMBER_ID, EVENT_INSTANCES, MEMBERS, SEED_BOOKINGS } from '@/data/mock';
import type { Booking } from '@/types';

let idCounter = 1000;
function nextId() {
  idCounter += 1;
  return `b${idCounter}`;
}

export type InstanceStatus = {
  confirmedCount: number;
  waitlistCount: number;
  capacity: number;
  openSlots: number;
  isFull: boolean;
  myBooking: Booking | null;
};

type StoreValue = {
  currentMemberId: string;
  bookings: Booking[];
  statusFor: (instanceId: string) => InstanceStatus;
  book: (instanceId: string) => void;
  cancel: (instanceId: string) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>(SEED_BOOKINGS);
  const currentMemberId = CURRENT_MEMBER_ID;

  const capacityOf = useCallback((instanceId: string) => {
    return EVENT_INSTANCES.find((i) => i.id === instanceId)?.capacity ?? 0;
  }, []);

  const statusFor = useCallback(
    (instanceId: string): InstanceStatus => {
      const forInstance = bookings.filter((b) => b.instanceId === instanceId);
      const confirmed = forInstance.filter((b) => b.status === 'confirmed');
      const waitlisted = forInstance.filter((b) => b.status === 'waitlisted');
      const capacity = capacityOf(instanceId);
      const openSlots = Math.max(0, capacity - confirmed.length);
      const myBooking = forInstance.find((b) => b.memberId === currentMemberId) ?? null;
      return {
        confirmedCount: confirmed.length,
        waitlistCount: waitlisted.length,
        capacity,
        openSlots,
        isFull: openSlots === 0,
        myBooking,
      };
    },
    [bookings, capacityOf, currentMemberId],
  );

  const book = useCallback(
    (instanceId: string) => {
      setBookings((prev) => {
        // Ignore if already booked/waitlisted.
        if (prev.some((b) => b.instanceId === instanceId && b.memberId === currentMemberId)) {
          return prev;
        }
        const confirmedCount = prev.filter(
          (b) => b.instanceId === instanceId && b.status === 'confirmed',
        ).length;
        const capacity = capacityOf(instanceId);
        const status = confirmedCount < capacity ? 'confirmed' : 'waitlisted';
        const newBooking: Booking = {
          id: nextId(),
          instanceId,
          memberId: currentMemberId,
          status,
          createdAt: new Date().toISOString(),
        };
        return [...prev, newBooking];
      });
    },
    [capacityOf, currentMemberId],
  );

  const cancel = useCallback(
    (instanceId: string) => {
      setBookings((prev) => {
        const mine = prev.find(
          (b) => b.instanceId === instanceId && b.memberId === currentMemberId,
        );
        if (!mine) return prev;

        let next = prev.filter((b) => b.id !== mine.id);

        // Auto-promote: if a confirmed seat was freed, promote the earliest waitlisted member.
        if (mine.status === 'confirmed') {
          const waitlist = next
            .filter((b) => b.instanceId === instanceId && b.status === 'waitlisted')
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          const promote = waitlist[0];
          if (promote) {
            next = next.map((b) =>
              b.id === promote.id ? { ...b, status: 'confirmed' } : b,
            );
          }
        }
        return next;
      });
    },
    [currentMemberId],
  );

  const value = useMemo<StoreValue>(
    () => ({ currentMemberId, bookings, statusFor, book, cancel }),
    [currentMemberId, bookings, statusFor, book, cancel],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}

export function memberName(memberId: string): string {
  return MEMBERS.find((m) => m.id === memberId)?.name ?? 'Unknown';
}
