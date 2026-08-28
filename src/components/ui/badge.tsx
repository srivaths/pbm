import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type BadgeTone = 'accent' | 'good' | 'warn' | 'muted' | 'neutral';

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  accent: { bg: '#3BA55D', fg: '#ffffff' },
  good: { bg: '#1F9254', fg: '#ffffff' },
  warn: { bg: '#E5484D', fg: '#ffffff' },
  muted: { bg: '#8B8D98', fg: '#ffffff' },
  neutral: { bg: 'rgba(127,127,127,0.18)', fg: '#8B8D98' },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const { bg, fg } = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <ThemedText type="small" style={[styles.text, { color: fg }]}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});
