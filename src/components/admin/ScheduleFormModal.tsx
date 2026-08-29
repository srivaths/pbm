import { useEffect, useState } from 'react';

import { useStore } from '@/data/store';
import { ChipSelect, FormModal, TextField, nextHourLocalInput, parseLocalInput } from './form-kit';

export function ScheduleFormModal({
  visible,
  defaultEventId,
  onClose,
}: {
  visible: boolean;
  defaultEventId?: string | null;
  onClose: () => void;
}) {
  const { events, createInstance } = useStore();

  const [eventId, setEventId] = useState<string>('');
  const [when, setWhen] = useState('');
  const [capacity, setCapacity] = useState('8');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setEventId(defaultEventId ?? events[0]?.id ?? '');
    setWhen(nextHourLocalInput());
    setCapacity('8');
    setError(null);
    setBusy(false);
  }, [visible, defaultEventId, events]);

  const capNum = Number(capacity);
  const iso = parseLocalInput(when);
  const valid = Boolean(eventId) && iso !== null && Number.isFinite(capNum) && capNum > 0;

  const submit = async () => {
    if (!eventId) {
      setError('Create an event first, then schedule a session for it.');
      return;
    }
    if (!iso) {
      setError('Use the date/time format YYYY-MM-DD HH:MM (e.g. 2026-09-01 18:00).');
      return;
    }
    if (!Number.isFinite(capNum) || capNum <= 0) {
      setError('Capacity must be greater than 0.');
      return;
    }
    setBusy(true);
    setError(null);
    const err = await createInstance({ eventId, startsAt: iso, capacity: Math.round(capNum) });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    onClose();
  };

  return (
    <FormModal
      visible={visible}
      title="Schedule a session"
      onClose={onClose}
      onSubmit={submit}
      submitLabel="Schedule"
      busy={busy}
      error={error}
      submitDisabled={!valid}>
      {events.length > 0 ? (
        <ChipSelect
          label="Event"
          options={events.map((e) => e.id)}
          value={eventId}
          onChange={setEventId}
          renderLabel={(id) => events.find((e) => e.id === id)?.title ?? 'Event'}
        />
      ) : null}
      <TextField
        label="Date & time"
        value={when}
        onChangeText={setWhen}
        placeholder="2026-09-01 18:00"
        hint="Format: YYYY-MM-DD HH:MM (your local time)"
      />
      <TextField label="Capacity" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" placeholder="8" />
    </FormModal>
  );
}
