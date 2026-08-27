import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

const ACCENT = '#3BA55D'; // pickleball court green

type Section = {
  emoji: string;
  title: string;
  description: string;
  status?: 'planned' | 'soon';
};

const SECTIONS: Section[] = [
  {
    emoji: '👥',
    title: 'Membership',
    description: 'Roster, membership types, dues status, and member profiles.',
    status: 'planned',
  },
  {
    emoji: '📋',
    title: 'Events',
    description: 'Clinics, lessons, and sessions with skill level and instructor.',
    status: 'planned',
  },
  {
    emoji: '📅',
    title: 'Schedule',
    description: 'Book a slot, join the waitlist, and get auto-promoted when one opens.',
    status: 'planned',
  },
  {
    emoji: '💳',
    title: 'Payments',
    description: 'Monthly or annual dues and event fees via Stripe.',
    status: 'planned',
  },
  {
    emoji: '🏆',
    title: 'Tournaments',
    description: 'Brackets, seeding, and scoring — coming in a later phase.',
    status: 'soon',
  },
];

function SectionCard({ section }: { section: Section }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText style={styles.cardEmoji}>{section.emoji}</ThemedText>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <ThemedText type="smallBold">{section.title}</ThemedText>
          {section.status === 'soon' && (
            <View style={styles.badge}>
              <ThemedText type="small" style={styles.badgeText}>
                soon
              </ThemedText>
            </View>
          )}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {section.description}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.pill}>
              <ThemedText type="small" style={styles.pillText}>
                🎾 PROTOTYPE
              </ThemedText>
            </View>
            <ThemedText type="title" style={styles.title}>
              Pickleball{'\n'}Club Manager
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
              Membership, events, scheduling, and payments — for your club.
            </ThemedText>
          </View>

          <View style={styles.cards}>
            {SECTIONS.map((section) => (
              <SectionCard key={section.title} section={section} />
            ))}
          </View>

          <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
            v0.1 · scaffold running. Next: sign-in and club setup.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'stretch',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.five,
  },
  header: {
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  pill: {
    backgroundColor: ACCENT,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
  },
  pillText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  title: {
    fontSize: 40,
    lineHeight: 44,
  },
  subtitle: {
    maxWidth: 460,
  },
  cards: {
    gap: Spacing.three,
  },
  card: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'flex-start',
  },
  cardEmoji: {
    fontSize: 26,
    lineHeight: 32,
  },
  cardBody: {
    flex: 1,
    gap: Spacing.half,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  badge: {
    backgroundColor: ACCENT,
    paddingHorizontal: Spacing.one,
    borderRadius: 999,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    paddingTop: Spacing.two,
  },
});
