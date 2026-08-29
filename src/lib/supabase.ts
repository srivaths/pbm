import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// True once both env values are present. The app checks this to show a friendly
// "connect Supabase" message instead of crashing when it isn't configured yet.
export const isSupabaseConfigured = Boolean(url && anonKey);

// When unconfigured we still create a client against a dummy URL so imports don't
// throw; no requests are made until the sign-in screen is used (which is gated on
// isSupabaseConfigured).
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // On web, clicking the magic link returns to the app with a code in the URL that
    // supabase-js exchanges for a session. Native uses deep links (added later).
    detectSessionInUrl: Platform.OS === 'web',
  },
});
