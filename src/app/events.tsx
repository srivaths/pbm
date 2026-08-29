import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EventFormModal } from '@/components/admin/EventFormModal';
import { ScheduleFormModal } from '@/components/admin/ScheduleFormModal';
import { ACCENT, DANGER, confirmAsync } from '@/components/admin/form-kit';
import { Badge } from '@/components/ui/badge';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useStore } from '@/data/store';
import type { EventTemplate } from '@/types';

function durationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = min / 60;
  return Number.isInteger(h) ? `${h} hr` : `${h.toFixed(1)} hr`;
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

export default function EventsScreen() {
  const { events, instances, loading, isAdmin, deleteEvent } = useStore();

  const [eventModal, setEventModal] = useState<{ open: boolean; target: EventTemplate | null }>({
    open: false,
    target: null,
  });
  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; eventId: string | null }>({
    open: false,
    eventId: null,
  });
  const [actionError, setActionError] = useState<string | null>(null);

  const remove = async (e: EventTemplate) => {
    const ok = await confirmAsync(
      `Delete "${e.title}"? This also removes its scheduled sessions and any bookings for them.`,
    );
    if (!ok) return;
    const err = await deleteEvent(e.id);
    setActionError(err);
  };

  return (
    <Screen title="Events" subtitle={loading ? 'Loading…' : 'Event types your club offers'}>
      {isAdmin ? (
        <View style={styles.adminBar}>
          <AdminButton label="+ New event" tone="primary" onPress={() => setEventModal({ open: true, target: null })} />
          {events.length > 0 ? (
            <AdminButton label="Schedule session" onPress={() => setScheduleModal({ open: true, eventId: null })} />
          ) : null}
        </View>
      ) : null}

      {actionError ? (
        <ThemedText type="small" style={styles.errorLine}>
          {actionError}
        </ThemedText>
      ) : null}

      <View style={styles.list}>
        {events.map((e) => {
          const instanceCount = instances.filter((i) => i.eventId === e.id).length;
          return (
            <ThemedView key={e.id} type="backgroundElement" style={styles.card}>
              <View style={styles.titleRow}>
                <ThemedText type="smallBold" style={styles.title}>
                  {e.title}
                </ThemedText>
                <Badge
                  label={e.skillLevel === 'Any' ? 'Any level' : `${e.skillLevel}+`}
                  tone={e.skillLevel === 'Any' ? 'neutral' : 'accent'}
                />
              </View>
              <View style={styles.metaRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  ⏱ {durationLabel(e.durationMin)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  👤 {e.instructor ?? 'No instructor'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  📅 {instanceCount} scheduled
                </ThemedText>
              </View>

              {isAdmin ? (
                <View style={styles.cardActions}>
                  <AdminButton label="Schedule" onPress={() => setScheduleModal({ open: true, eventId: e.id })} />
                  <AdminButton label="Edit" onPress={() => setEventModal({ open: true, target: e })} />
                  <AdminButton label="Delete" tone="danger" onPress={() => remove(e)} />
                </View>
              ) : null}
            </ThemedView>
          );
        })}
      </View>

      {!isAdmin ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          Admins create and edit event types here.
        </ThemedText>
      ) : null}

      <EventFormModal
        visible={eventModal.open}
        initial={eventModal.target}
        onClose={() => setEventModal({ open: false, target: null })}
      />
      <ScheduleFormModal
        visible={scheduleModal.open}
        defaultEventId={scheduleModal.eventId}
        onClose={() => setScheduleModal({ open: false, eventId: null })}
      />
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
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
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
  note: {
    textAlign: 'center',
    marginTop: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
