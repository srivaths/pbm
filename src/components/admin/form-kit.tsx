import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const ACCENT = '#3BA55D';
export const DANGER = '#E5484D';

/** Cross-platform confirm dialog. Resolves true if the user confirms. */
export function confirmAsync(message: string, confirmLabel = 'Delete'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(message) : false);
  }
  return new Promise((resolve) => {
    Alert.alert('Please confirm', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

// ---- date/time helpers (local time <-> ISO), format "YYYY-MM-DD HH:MM" ----
function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Format a Date as a local "YYYY-MM-DD HH:MM" string for the text field. */
export function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

/** Parse a local "YYYY-MM-DD HH:MM" (or with a T) string to an ISO timestamp, or null. */
export function parseLocalInput(s: string): string | null {
  const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

/** A local-time string for the next full hour — a sensible default for scheduling. */
export function nextHourLocalInput(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toLocalInput(d);
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'number-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  hint?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.fieldWrap}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

/** A row of selectable chips for a fixed set of options. */
export function ChipSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  renderLabel,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  renderLabel?: (v: T) => string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.fieldWrap}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const selected = opt === value;
          return (
            <Pressable key={opt} onPress={() => onChange(opt)}>
              <View
                style={[
                  styles.chip,
                  { backgroundColor: selected ? ACCENT : theme.backgroundElement },
                ]}>
                <ThemedText type="small" style={selected ? styles.chipTextSelected : undefined}>
                  {renderLabel ? renderLabel(opt) : opt}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Modal shell with a title, scrollable body, error line, and Cancel/Submit actions. */
export function FormModal({
  visible,
  title,
  children,
  onClose,
  onSubmit,
  submitLabel,
  busy,
  error,
  submitDisabled,
}: {
  visible: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
  submitDisabled?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView style={styles.sheet}>
          <ThemedText type="subtitle" style={styles.sheetTitle}>
            {title}
          </ThemedText>
          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            {children}
            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable onPress={onClose} disabled={busy} style={({ pressed }) => pressed && styles.pressed}>
              <View style={[styles.btn, styles.btnSecondary]}>
                <ThemedText type="smallBold">Cancel</ThemedText>
              </View>
            </Pressable>
            <Pressable
              onPress={onSubmit}
              disabled={busy || submitDisabled}
              style={({ pressed }) => pressed && styles.pressed}>
              <View style={[styles.btn, styles.btnPrimary, (busy || submitDisabled) && styles.btnDisabled]}>
                {busy ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <ThemedText type="smallBold" style={styles.btnPrimaryText}>
                    {submitLabel}
                  </ThemedText>
                )}
              </View>
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '86%',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sheetTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  sheetBody: {
    gap: Spacing.three,
    paddingBottom: Spacing.one,
  },
  fieldWrap: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  btn: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 999,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: ACCENT,
  },
  btnPrimaryText: {
    color: '#ffffff',
  },
  btnSecondary: {
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    color: DANGER,
  },
});
