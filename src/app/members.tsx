import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MemberFormModal } from '@/components/admin/MemberFormModal';
import { ACCENT, DANGER, confirmAsync } from '@/components/admin/form-kit';
import { Badge } from '@/components/ui/badge';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useStore } from '@/data/store';
import { duesLabel, membershipLabel } from '@/lib/format';
import type { Member } from '@/types';

function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function AdminButton({
  label,
  tone = 'neutral',
  onPress,
}: {
  label: string;
  tone?: 'primary' | 'neutral' | 'danger';
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <View
        style={[
          styles.adminBtn,
          tone === 'primary' && styles.adminBtnPrimary,
          tone === 'danger' && styles.adminBtnDanger,
        ]}>
        <ThemedText
          type="smallBold"
          style={tone === 'primary' ? styles.adminBtnPrimaryText : tone === 'danger' ? styles.dangerText : undefined}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export default function MembersScreen() {
  const { members, loading, isAdmin, currentMemberId, deleteMember } = useStore();
  const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name));

  const [modal, setModal] = useState<{ open: boolean; target: Member | null }>({ open: false, target: null });
  const [actionError, setActionError] = useState<string | null>(null);

  const remove = async (m: Member) => {
    const ok = await confirmAsync(`Remove ${m.name} from the roster? This also cancels their bookings.`);
    if (!ok) return;
    const err = await deleteMember(m.id);
    setActionError(err);
  };

  return (
    <Screen title="Members" subtitle={loading ? 'Loading…' : `${members.length} in the roster`}>
      {isAdmin ? (
        <View style={styles.adminBar}>
          <AdminButton label="+ Add member" tone="primary" onPress={() => setModal({ open: true, target: null })} />
        </View>
      ) : null}

      {actionError ? (
        <ThemedText type="small" style={styles.errorLine}>
          {actionError}
        </ThemedText>
      ) : null}

      <View style={styles.list}>
        {sorted.map((m) => {
          const dues = duesLabel(m.duesStatus);
          const isSelf = m.id === currentMemberId;
          return (
            <ThemedView key={m.id} type="backgroundElement" style={styles.row}>
              <View style={styles.avatar}>
                <ThemedText type="smallBold" style={styles.avatarText}>
                  {initials(m.name)}
                </ThemedText>
              </View>
              <View style={styles.main}>
                <View style={styles.nameRow}>
                  <ThemedText type="smallBold">{m.name}</ThemedText>
                  {isSelf ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      (you)
                    </ThemedText>
                  ) : null}
                </View>
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

                {isAdmin ? (
                  <View style={styles.cardActions}>
                    <AdminButton label="Edit" onPress={() => setModal({ open: true, target: m })} />
                    {!isSelf ? <AdminButton label="Remove" tone="danger" onPress={() => remove(m)} /> : null}
                  </View>
                ) : null}
              </View>
            </ThemedView>
          );
        })}
      </View>

      <MemberFormModal
        visible={modal.open}
        initial={modal.target}
        onClose={() => setModal({ open: false, target: null })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  adminBar: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  list: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'flex-start',
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  adminBtn: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  adminBtnPrimary: {
    backgroundColor: ACCENT,
  },
  adminBtnPrimaryText: {
    color: '#ffffff',
  },
  adminBtnDanger: {
    backgroundColor: 'rgba(229,72,77,0.15)',
  },
  dangerText: {
    color: DANGER,
  },
  errorLine: {
    color: DANGER,
    marginBottom: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
