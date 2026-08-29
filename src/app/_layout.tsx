import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { SignInScreen } from '@/auth/SignInScreen';
import { ThemedView } from '@/components/themed-view';
import { StoreProvider } from '@/data/store';

SplashScreen.preventAutoHideAsync();

function Gate() {
  const { session, loading, configured } = useAuth();

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  // Not signed in (or Supabase not configured yet) -> sign-in / connect screen.
  if (!configured || !session) {
    return <SignInScreen />;
  }

  return (
    <StoreProvider>
      <AnimatedSplashOverlay />
      <AppTabs />
    </StoreProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <View style={{ flex: 1 }}>
          <Gate />
        </View>
      </AuthProvider>
    </ThemeProvider>
  );
}
