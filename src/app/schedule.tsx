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
  const { events, instances, bookings, members, statusFor, book, cancel, loading, isAdmin, deleteInstance, adminCancelBooking } =
    useStore();
  const [pending, setPending] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleRoster = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? 'Unknown member';

  // Roster ordered the way seats are filled: confirmed first, then the waitlist
  // in join order (which is the promote order).
  const rosterFor = (instanceId: string) =>
    bookings
      .filter((b) => b.instanceId === instanceId)
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'confirmed' ? -1 : 1;
        return a.createdAt.localeCompare(b.createdAt);
      });

  const removeBooking = async (instanceId: string, memberId: string, name: string) => {
    const ok = await confirmAsync(`Remove ${name} from this session?`, 'Remove');
    if (!ok) return;
    setPending(instanceId);
    const err = await adminCancelBooking(instanceId, memberId);
    setPending(null);
    setActionError(err);
  };

  const sorted = [...instances].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const run = async (instanceId: string, fn: (id: string) => Promise<string | null>) => {
    setPending(instanceId);
    setActionError(null);
    try {
      const err = await fn(instanceId);
      setActionError(err);
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
                <View style={styles.adminBox}>
                  {(() => {
                    const roster = rosterFor(instance.id);
                    const isOpen = expanded[instance.id];
                    return (
                      <>
                        <View style={styles.adminHeaderRow}>
                          <Pressable
                            onPress={() => toggleRoster(instance.id)}
                            style={({ pressed }) => pressed && styles.pressed}>
                            <ThemedText type="smallBold" themeColor="textSecondary">
                              {isOpen ? '▾' : '▸'} Roster ({roster.length})
                            </ThemedText>
                          </Pressable>
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

                        {isOpen ? (
                          roster.length === 0 ? (
                            <ThemedText type="small" themeColor="textSecondary">
                              No one has booked yet.
                            </ThemedText>
                          ) : (
                            <View style={styles.rosterList}>
                              {roster.map((b) => (
                                <View key={b.id} style={styles.rosterRow}>
                                  <View style={styles.rosterWho}>
                                    <ThemedText type="small">{memberName(b.memberId)}</ThemedText>
                                    <Badge
                                      label={b.status === 'confirmed' ? 'Confirmed' : 'Waitlisted'}
                                      tone={b.status === 'confirmed' ? 'good' : 'warn'}
                                    />
                                  </View>
                                  <Pressable
                                    onPress={() => removeBooking(instance.id, b.memberId, memberName(b.memberId))}
                                    disabled={busy}
                                    style={({ pressed }) => pressed && styles.pressed}>
                                    <ThemedText type="smallBold" style={styles.dangerText}>
                                      Remove
                                    </ThemedText>
                                  </Pressable>
                                </View>
                              ))}
                            </View>
                          )
                        ) : null}
                      </>
                    );
                  })()}
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
  adminBox: {
    marginTop: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(127,127,127,0.3)',
    gap: Spacing.two,
  },
  adminHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  rosterList: {
    gap: Spacing.two,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  rosterWho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
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
