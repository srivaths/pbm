import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';

const ACCENT = '#3BA55D';

// Where the emailed link should return the user. On web that's the current origin
// (e.g. http://localhost:8081); supabase-js exchanges the code in the URL for a session.
function redirectTo(): string | undefined {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return undefined;
}

type Step = 'email' | 'sent';

export function SignInScreen() {
  const theme = useTheme();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSupabaseConfigured) {
    return (
      <ThemedView style={styles.root}>
        <View style={styles.card}>
          <ThemedText type="subtitle">Connect Supabase</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Add your project URL and anon key to the .env file, then restart the dev server. See
            docs/SUPABASE_SETUP.md for the steps.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const sendLink = async () => {
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: redirectTo() },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep('sent');
    // When the user clicks the emailed link, the app reloads with a code in the URL;
    // supabase-js exchanges it and onAuthStateChange in AuthProvider swaps in the app.
  };

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
  ];

  return (
    <ThemedView style={styles.root}>
      <View style={styles.card}>
        <ThemedText style={styles.logo}>🎾</ThemedText>
        <ThemedText type="subtitle">Pickleball Club Manager</ThemedText>

        {step === 'email' ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Enter your email and we'll send you a sign-in link.
            </ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="you@example.com"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              inputMode="email"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={sendLink}
            />
            <PrimaryButton label="Send sign-in link" busy={busy} disabled={!email.includes('@')} onPress={sendLink} />
          </>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Check {email} for a sign-in link. Click it and you'll be signed in
              automatically — you can leave this tab open.
            </ThemedText>
            <Pressable onPress={() => { setStep('email'); setError(null); }}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.link}>
                ← Use a different email
              </ThemedText>
            </Pressable>
          </>
        )}

        {error ? (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}
      </View>
    </ThemedView>
  );
}

function PrimaryButton({
  label,
  onPress,
  busy,
  disabled,
}: {
  label: string;
  onPress: () => void;
  busy: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      style={({ pressed }) => [
        styles.button,
        (busy || disabled) && styles.buttonDisabled,
        pressed && styles.pressed,
      ]}>
      {busy ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <ThemedText type="smallBold" style={styles.buttonText}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    gap: Spacing.three,
    alignItems: 'stretch',
  },
  logo: {
    fontSize: 40,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  button: {
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingVertical: Spacing.two + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
  },
  link: {
    textAlign: 'center',
  },
  error: {
    color: Colors.light.text,
    backgroundColor: 'rgba(229,72,77,0.15)',
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  pressed: {
    opacity: 0.8,
  },
});
