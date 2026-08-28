import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { EVENTS, EVENT_INSTANCES } from '@/data/mock';

function durationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = min / 60;
  return Number.isInteger(h) ? `${h} hr` : `${h.toFixed(1)} hr`;
}

export default function EventsScreen() {
  return (
    <Screen title="Events" subtitle="Event types your club offers">
      <View style={styles.list}>
        {EVENTS.map((e) => {
          const instanceCount = EVENT_INSTANCES.filter((i) => i.eventId === e.id).length;
          return (
            <ThemedView key={e.id} type="backgroundElement" style={styles.card}>
              <View style={styles.titleRow}>
                <ThemedText type="smallBold" style={styles.title}>
                  {e.title}
                </ThemedText>
                <Badge
                  label={e.skillLevel === 'Any' ? 'Any level' : `${e.skillLevel}+`}
                  tone={e.skillLevel === 'Any' ? 'neutral' : 'accent'}
                />
              </View>
              <View style={styles.metaRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  ⏱ {durationLabel(e.durationMin)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  👤 {e.instructor ?? 'No instructor'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  📅 {instanceCount} scheduled
                </ThemedText>
              </View>
            </ThemedView>
          );
        })}
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        Admins will create and edit event types here. (Editing UI comes next.)
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  note: {
    textAlign: 'center',
  },
});
