import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { MEMBERS } from '@/data/mock';
import { duesLabel, membershipLabel } from '@/lib/format';

function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function MembersScreen() {
  const sorted = [...MEMBERS].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Screen title="Members" subtitle={`${MEMBERS.length} in the roster`}>
      <View style={styles.list}>
        {sorted.map((m) => {
          const dues = duesLabel(m.duesStatus);
          return (
            <ThemedView key={m.id} type="backgroundElement" style={styles.row}>
              <View style={styles.avatar}>
                <ThemedText type="smallBold" style={styles.avatarText}>
                  {initials(m.name)}
                </ThemedText>
              </View>
              <View style={styles.main}>
                <ThemedText type="smallBold">{m.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {m.email}
                </ThemedText>
                <View style={styles.badges}>
                  <Badge
                    label={membershipLabel(m.membershipType)}
                    tone={m.membershipType === 'admin' ? 'accent' : 'neutral'}
                  />
                  <Badge label={`${m.skillRating.toFixed(1)} skill`} tone="neutral" />
                  <Badge label={dues.label} tone={dues.tone} />
                </View>
              </View>
            </ThemedView>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3BA55D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
  },
  main: {
    flex: 1,
    gap: Spacing.half,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: 2,
  },
});
