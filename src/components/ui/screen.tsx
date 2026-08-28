import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

type ScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

// Handles the platform-specific tab chrome: on web the tab bar floats at the top,
// on native it sits at the bottom. Keeps all screens padded consistently.
export function Screen({ title, subtitle, children }: ScreenProps) {
  const insets = useSafeAreaInsets();

  const topPad = Platform.select({ web: Spacing.six + Spacing.four, default: insets.top + Spacing.three });
  const bottomPad = Platform.select({
    web: Spacing.six,
    default: insets.bottom + BottomTabInset + Spacing.four,
  });

  return (
    <ThemedView style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad, paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <ThemedText type="subtitle">{title}</ThemedText>
            {subtitle ? (
              <ThemedText type="default" themeColor="textSecondary">
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
          {children}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.one,
  },
});
