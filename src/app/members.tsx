import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AddRatingModal } from '@/components/admin/AddRatingModal';
import { ClubSettingsModal } from '@/components/admin/ClubSettingsModal';
import { MemberFormModal } from '@/components/admin/MemberFormModal';
import { ACCENT, DANGER, confirmAsync } from '@/components/admin/form-kit';
import { Badge } from '@/components/ui/badge';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useStore } from '@/data/store';
import { daysSinceDate, duesLabel, formatDate, membershipLabel } from '@/lib/format';
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
  const { members, club, loading, isAdmin, currentMemberId, deleteMember, setMemberStatus, ratingsFor, attendanceFor } =
    useStore();
  const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name));
  const graceDays = club?.graceDays ?? 14;

  const [memberModal, setMemberModal] = useState<{ open: boolean; target: Member | null }>({
    open: false,
    target: null,
  });
  const [ratingModal, setRatingModal] = useState<{ open: boolean; memberId: string | null; name: string }>({
    open: false,
    memberId: null,
    name: '',
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const toggleHistory = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const remove = async (m: Member) => {
    const ok = await confirmAsync(
      `Permanently delete ${m.name}? This erases their history and bookings. Use Suspend instead if you may reinstate them.`,
    );
    if (!ok) return;
    setActionError(await deleteMember(m.id));
  };

  const suspend = async (m: Member) => {
    const ok = await confirmAsync(
      `Suspend ${m.name}? They'll be removed from upcoming sessions and can't book until reinstated. Their history is kept.`,
      'Suspend',
    );
    if (!ok) return;
    setActionError(await setMemberStatus(m.id, 'suspended'));
  };

  const reinstate = async (m: Member) => {
    setActionError(await setMemberStatus(m.id, 'active'));
  };

  return (
    <Screen title="Members" subtitle={loading ? 'Loading…' : `${members.length} in the roster`}>
      {isAdmin ? (
        <View style={styles.adminBar}>
          <AdminButton label="+ Add member" tone="primary" onPress={() => setMemberModal({ open: true, target: null })} />
          <AdminButton label={`Grace: ${graceDays}d · Settings`} onPress={() => setSettingsOpen(true)} />
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
          const suspended = m.status === 'suspended';
          const daysPastDue = m.pastDueSince ? daysSinceDate(m.pastDueSince) : null;
          const overGrace = daysPastDue !== null && daysPastDue > graceDays;
          const isOpen = expanded[m.id];
          const ratings = ratingsFor(m.id);
          const attendance = attendanceFor(m.id);

          return (
            <ThemedView key={m.id} type="backgroundElement" style={[styles.row, suspended && styles.rowSuspended]}>
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
                  {suspended ? <Badge label="Suspended" tone="warn" /> : null}
                  <Badge
                    label={membershipLabel(m.membershipType)}
                    tone={m.membershipType === 'admin' ? 'accent' : 'neutral'}
                  />
                  <Badge label={`${m.skillRating.toFixed(1)} skill`} tone="neutral" />
                  <Badge label={dues.label} tone={dues.tone} />
                </View>

                {daysPastDue !== null ? (
                  <ThemedText type="small" style={overGrace ? styles.overGrace : styles.textMuted}>
                    Past due {daysPastDue}d{overGrace ? ` · over ${graceDays}d grace — consider suspending` : ''}
                  </ThemedText>
                ) : null}

                {isAdmin ? (
                  <View style={styles.cardActions}>
                    <AdminButton label="Edit" onPress={() => setMemberModal({ open: true, target: m })} />
                    <AdminButton label={isOpen ? 'Hide history' : 'History'} onPress={() => toggleHistory(m.id)} />
                    {suspended ? (
                      <AdminButton label="Reinstate" tone="primary" onPress={() => reinstate(m)} />
                    ) : !isSelf ? (
                      <AdminButton label="Suspend" onPress={() => suspend(m)} />
                    ) : null}
                    {!isSelf ? <AdminButton label="Delete" tone="danger" onPress={() => remove(m)} /> : null}
                  </View>
                ) : null}

                {isAdmin && isOpen ? (
                  <View style={styles.history}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Attendance: {attendance.attended} attended · {attendance.upcoming} upcoming
                    </ThemedText>

                    <View style={styles.historyHead}>
                      <ThemedText type="smallBold">Rating history</ThemedText>
                      <AdminButton
                        label="+ Add rating"
                        onPress={() => setRatingModal({ open: true, memberId: m.id, name: m.name })}
                      />
                    </View>

                    {ratings.length === 0 ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        No ratings recorded yet.
                      </ThemedText>
                    ) : (
                      ratings.map((r) => (
                        <View key={r.id} style={styles.ratingRow}>
                          <ThemedText type="smallBold">{r.rating.toFixed(3)}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {r.source} · {formatDate(r.asOf)}
                            {r.note ? ` · ${r.note}` : ''}
                          </ThemedText>
                        </View>
                      ))
                    )}
                  </View>
                ) : null}
              </View>
            </ThemedView>
          );
        })}
      </View>

      <MemberFormModal
        visible={memberModal.open}
        initial={memberModal.target}
        onClose={() => setMemberModal({ open: false, target: null })}
      />
      <AddRatingModal
        visible={ratingModal.open}
        memberId={ratingModal.memberId}
        memberName={ratingModal.name}
        onClose={() => setRatingModal({ open: false, memberId: null, name: '' })}
      />
      <ClubSettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  adminBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  rowSuspended: {
    opacity: 0.72,
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
  textMuted: {
    color: '#60646C',
  },
  overGrace: {
    color: DANGER,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  history: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(127,127,127,0.3)',
    gap: Spacing.two,
  },
  historyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
    flexWrap: 'wrap',
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
