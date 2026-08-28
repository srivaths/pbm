import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

// NOTE: reusing the two starter icons (home/explore) as placeholders for all four
// tabs. Swap in proper Members/Events/Schedule icons when we do the native build.
const homeIcon = require('@/assets/images/tabIcons/home.png');
const exploreIcon = require('@/assets/images/tabIcons/explore.png');

const TABS = [
  { name: 'index', label: 'Home', icon: homeIcon },
  { name: 'members', label: 'Members', icon: exploreIcon },
  { name: 'events', label: 'Events', icon: exploreIcon },
  { name: 'schedule', label: 'Schedule', icon: homeIcon },
] as const;

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      {TABS.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={t.icon} renderingMode="template" />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
