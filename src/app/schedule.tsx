import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ScheduleFormModal } from '@/components/admin/ScheduleFormModal';
import { ACCENT, DANGER, confirmAsync } from '@/components/admin/form-kit';
import { Badge } from '@/components/ui/badge';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useStore } from '@/data/store';
import { formatDateTime } from '@/lib/format';

function ActionButton({
  label,
  tone,
  busy,
  onPress,
}: {
  label: string;
  tone: 'primary' | 'secondary';
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => pressed && styles.pressed}>
      <View style={[styles.btn, tone === 'primary' ? styles.btnPrimary : styles.btnSecondary]}>
        {busy ? (
          <ActivityIndicator size="small" color={tone === 'primary' ? '#ffffff' : undefined} />
        ) : (
          <ThemedText type="smallBold" style={tone === 'primary' ? styles.btnPrimaryText : undefined}>
            {label}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

function CapacityBar({ confirmed, capacity }: { confirmed: number; capacity: number }) {
  const pct = capacity === 0 ? 0 : Math.min(1, confirmed / capacity);
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

export default function ScheduleScreen() {
  const { events, instances, statusFor, book, cancel, loading, isAdmin, deleteInstance } = useStore();
  const [pending, setPending] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const sorted = [...instances].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const run = async (instanceId: string, fn: (id: string) => Promise<void>) => {
    setPending(instanceId);
    try {
      await fn(instanceId);
    } finally {
      setPending(null);
    }
  };

  const removeInstance = async (instanceId: string, title: string, when: string) => {
    const ok = await confirmAsync(`Delete the ${title} session on ${when}? This cancels all its bookings.`);
    if (!ok) return;
    setPending(instanceId);
    const err = await deleteInstance(instanceId);
    setPending(null);
    setActionError(err);
  };

  return (
    <Screen
      title="Schedule"
      subtitle={loading ? 'Loading…' : 'Upcoming sessions — book a slot or join the waitlist'}>
      {isAdmin ? (
        <View style={styles.adminBar}>
          <Pressable onPress={() => setScheduleOpen(true)} style={({ pressed }) => pressed && styles.pressed}>
            <View style={[styles.btn, styles.btnPrimary]}>
              <ThemedText type="smallBold" style={styles.btnPrimaryText}>
                + Schedule session
              </ThemedText>
            </View>
          </Pressable>
        </View>
      ) : null}

      {actionError ? (
        <ThemedText type="small" style={styles.errorLine}>
          {actionError}
        </ThemedText>
      ) : null}

      <View style={styles.list}>
        {sorted.map((instance) => {
          const event = events.find((e) => e.id === instance.eventId);
          if (!event) return null;
          const s = statusFor(instance.id);
          const busy = pending === instance.id;
          const whenLabel = formatDateTime(instance.startsAt);

          return (
            <ThemedView key={instance.id} type="backgroundElement" style={styles.card}>
              <View style={styles.topRow}>
                <View style={styles.titleCol}>
                  <ThemedText type="smallBold">{event.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {whenLabel}
                  </ThemedText>
                </View>
                <Badge
                  label={event.skillLevel === 'Any' ? 'Any' : `${event.skillLevel}+`}
                  tone={event.skillLevel === 'Any' ? 'neutral' : 'accent'}
                />
              </View>

              <CapacityBar confirmed={s.confirmedCount} capacity={s.capacity} />

              <View style={styles.statusRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  {s.confirmedCount}/{s.capacity} booked
                  {s.isFull
                    ? s.waitlistCount > 0
                      ? ` · ${s.waitlistCount} waitlisted`
                      : ' · full'
                    : ` · ${s.openSlots} open`}
                </ThemedText>

                {s.myBooking?.status === 'confirmed' ? (
                  <View style={styles.actionCol}>
                    <Badge label="You're in" tone="good" />
                    <ActionButton label="Cancel" tone="secondary" busy={busy} onPress={() => run(instance.id, cancel)} />
                  </View>
                ) : s.myBooking?.status === 'waitlisted' ? (
                  <View style={styles.actionCol}>
                    <Badge label="Waitlisted" tone="warn" />
                    <ActionButton label="Leave" tone="secondary" busy={busy} onPress={() => run(instance.id, cancel)} />
                  </View>
                ) : s.isFull ? (
                  <ActionButton label="Join waitlist" tone="secondary" busy={busy} onPress={() => run(instance.id, book)} />
                ) : (
                  <ActionButton label="Book" tone="primary" busy={busy} onPress={() => run(instance.id, book)} />
                )}
              </View>

              {isAdmin ? (
                <View style={styles.adminRow}>
                  <Pressable
                    onPress={() => removeInstance(instance.id, event.title, whenLabel)}
                    disabled={busy}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <View style={[styles.btn, styles.btnDanger]}>
                      <ThemedText type="smallBold" style={styles.dangerText}>
                        Delete session
                      </ThemedText>
                    </View>
                  </Pressable>
                </View>
              ) : null}
            </ThemedView>
          );
        })}
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        Booking, waitlisting, and auto-promote (when a confirmed player cancels) are all enforced in the database.
      </ThemedText>

      <ScheduleFormModal visible={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  adminBar: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  list: {
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  barTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(127,127,127,0.2)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: ACCENT,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  actionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  adminRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.one,
  },
  btn: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: ACCENT,
  },
  btnSecondary: {
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  btnDanger: {
    backgroundColor: 'rgba(229,72,77,0.15)',
  },
  btnPrimaryText: {
    color: '#ffffff',
  },
  dangerText: {
    color: DANGER,
  },
  errorLine: {
    color: DANGER,
    marginBottom: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  note: {
    textAlign: 'center',
    marginTop: Spacing.three,
  },
});
