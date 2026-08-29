import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { useStore } from '@/data/store';
import { FormModal, TextField } from './form-kit';

export function ClubSettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { club, updateGraceDays } = useStore();

  const [days, setDays] = useState('14');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setDays(String(club?.graceDays ?? 14));
    setError(null);
    setBusy(false);
  }, [visible, club]);

  const daysNum = Number(days);
  const valid = Number.isInteger(daysNum) && daysNum >= 0 && daysNum <= 365;

  const submit = async () => {
    if (!valid) {
      setError('Enter a whole number of days between 0 and 365.');
      return;
    }
    setBusy(true);
    setError(null);
    const err = await updateGraceDays(daysNum);
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
      title="Club settings"
      onClose={onClose}
      onSubmit={submit}
      submitLabel="Save"
      busy={busy}
      error={error}
      submitDisabled={!valid}>
      <TextField
        label="Past-due grace period (days)"
        value={days}
        onChangeText={setDays}
        keyboardType="number-pad"
        placeholder="14"
        hint="How long a past-due member can stay before you suspend them."
      />
      <ThemedText type="small" themeColor="textSecondary">
        The app flags members who are over this window. Suspending is a manual step for now;
        automatic suspension comes later.
      </ThemedText>
    </FormModal>
  );
}
