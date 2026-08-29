import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useStore } from '@/data/store';
import { formatDateTime } from '@/lib/format';

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.stat}>
      <ThemedText type="title" style={styles.statValue}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const SHORTCUTS: { href: string; emoji: string; label: string }[] = [
  { href: '/members', emoji: '👥', label: 'Members' },
  { href: '/events', emoji: '📋', label: 'Events' },
  { href: '/schedule', emoji: '📅', label: 'Schedule' },
];

export default function HomeScreen() {
  const { signOut } = useAuth();
  const { loading, error, club, members, events, instances, bookings, currentMemberId } = useStore();

  const myBookings = bookings
    .filter((b) => b.memberId === currentMemberId)
    .map((b) => {
      const instance = instances.find((i) => i.id === b.instanceId);
      const event = instance ? events.find((e) => e.id === instance.eventId) : undefined;
      return instance && event ? { booking: b, instance, event } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.instance.startsAt.localeCompare(b.instance.startsAt));

  const upcomingCount = instances.filter((i) => new Date(i.startsAt).getTime() > Date.now()).length;

  return (
    <Screen title={club?.name ?? (loading ? 'Loading…' : 'Your club')} subtitle="Your club at a glance">
      {error ? (
        <ThemedView type="backgroundElement" style={styles.errorCard}>
          <ThemedText type="small">Couldn't load data: {error}</ThemedText>
        </ThemedView>
      ) : null}

      <View style={styles.statRow}>
        <Stat value={members.length} label="Members" />
        <Stat value={upcomingCount} label="Upcoming" />
        <Stat value={myBookings.length} label="My sessions" />
      </View>

      <View style={styles.block}>
        <ThemedText type="smallBold">Your upcoming sessions</ThemedText>
        {myBookings.length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.emptyCard}>
            <ThemedText type="small" themeColor="textSecondary">
              You haven't booked anything yet. Head to Schedule to grab a slot.
            </ThemedText>
          </ThemedView>
        ) : (
          myBookings.map(({ booking, instance, event }) => (
            <ThemedView key={booking.id} type="backgroundElement" style={styles.row}>
              <View style={styles.rowMain}>
                <ThemedText type="smallBold">{event.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatDateTime(instance.startsAt)}
                </ThemedText>
              </View>
              {booking.status === 'waitlisted' ? (
                <Badge label="Waitlisted" tone="warn" />
              ) : (
                <Badge label="Confirmed" tone="good" />
              )}
            </ThemedView>
          ))
        )}
      </View>

      <View style={styles.block}>
        <ThemedText type="smallBold">Jump to</ThemedText>
        <View style={styles.shortcutRow}>
          {SHORTCUTS.map((s) => (
            <Link key={s.href} href={s.href as never} asChild>
              <Pressable style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.shortcut}>
                  <ThemedText style={styles.shortcutEmoji}>{s.emoji}</ThemedText>
                  <ThemedText type="small">{s.label}</ThemedText>
                </ThemedView>
              </Pressable>
            </Link>
          ))}
        </View>
      </View>

      <Pressable onPress={signOut} style={({ pressed }) => pressed && styles.pressed}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.signOut}>
          Sign out
        </ThemedText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  stat: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  statValue: {
    fontSize: 32,
    lineHeight: 36,
  },
  block: {
    gap: Spacing.two,
  },
  errorCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  emptyCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  rowMain: {
    gap: 2,
    flex: 1,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  shortcut: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  shortcutEmoji: {
    fontSize: 24,
  },
  signOut: {
    textAlign: 'center',
    paddingVertical: Spacing.two,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.7,
  },
});
