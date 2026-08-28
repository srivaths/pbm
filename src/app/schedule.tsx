import { Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { EVENTS, EVENT_INSTANCES } from '@/data/mock';
import { useStore } from '@/data/store';
import { formatDateTime } from '@/lib/format';

const ACCENT = '#3BA55D';

function ActionButton({
  label,
  tone,
  onPress,
}: {
  label: string;
  tone: 'primary' | 'secondary';
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <View style={[styles.btn, tone === 'primary' ? styles.btnPrimary : styles.btnSecondary]}>
        <ThemedText
          type="smallBold"
          style={tone === 'primary' ? styles.btnPrimaryText : undefined}>
          {label}
        </ThemedText>
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
  const { statusFor, book, cancel } = useStore();

  const instances = [...EVENT_INSTANCES].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  );

  return (
    <Screen title="Schedule" subtitle="Upcoming sessions — book a slot or join the waitlist">
      <View style={styles.list}>
        {instances.map((instance) => {
          const event = EVENTS.find((e) => e.id === instance.eventId);
          if (!event) return null;
          const s = statusFor(instance.id);

          return (
            <ThemedView key={instance.id} type="backgroundElement" style={styles.card}>
              <View style={styles.topRow}>
                <View style={styles.titleCol}>
                  <ThemedText type="smallBold">{event.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatDateTime(instance.startsAt)}
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
                    <ActionButton label="Cancel" tone="secondary" onPress={() => cancel(instance.id)} />
                  </View>
                ) : s.myBooking?.status === 'waitlisted' ? (
                  <View style={styles.actionCol}>
                    <Badge label="Waitlisted" tone="warn" />
                    <ActionButton
                      label="Leave"
                      tone="secondary"
                      onPress={() => cancel(instance.id)}
                    />
                  </View>
                ) : s.isFull ? (
                  <ActionButton
                    label="Join waitlist"
                    tone="secondary"
                    onPress={() => book(instance.id)}
                  />
                ) : (
                  <ActionButton label="Book" tone="primary" onPress={() => book(instance.id)} />
                )}
              </View>
            </ThemedView>
          );
        })}
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        Tip: you're confirmed for the full Beginner Clinic with one player waitlisted. Cancel
        your spot to watch the waitlisted player get auto-promoted (the waitlist clears while it
        stays 4/4 booked).
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  btn: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
  },
  btnPrimary: {
    backgroundColor: ACCENT,
  },
  btnSecondary: {
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  btnPrimaryText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
  note: {
    textAlign: 'center',
  },
});
