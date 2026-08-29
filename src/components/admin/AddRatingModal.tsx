import { useEffect, useState } from 'react';

import { useStore } from '@/data/store';
import type { RatingSource } from '@/types';
import { ChipSelect, FormModal, TextField } from './form-kit';

const SOURCES: readonly RatingSource[] = ['DUPR', 'self', 'admin'];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return false;
  return !Number.isNaN(new Date(`${s.trim()}T00:00:00`).getTime());
}

export function AddRatingModal({
  visible,
  memberId,
  memberName,
  onClose,
}: {
  visible: boolean;
  memberId: string | null;
  memberName: string;
  onClose: () => void;
}) {
  const { addRating } = useStore();

  const [rating, setRating] = useState('');
  const [source, setSource] = useState<RatingSource>('DUPR');
  const [asOf, setAsOf] = useState(todayISO());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setRating('');
    setSource('DUPR');
    setAsOf(todayISO());
    setNote('');
    setError(null);
    setBusy(false);
  }, [visible]);

  const ratingNum = Number(rating);
  const validRating = Number.isFinite(ratingNum) && ratingNum > 0 && ratingNum < 10;
  const valid = validRating && isValidDate(asOf);

  const submit = async () => {
    if (!memberId) return;
    if (!validRating) {
      setError('Enter a rating between 0 and 10 (e.g. 3.456).');
      return;
    }
    if (!isValidDate(asOf)) {
      setError('Use an as-of date like 2026-08-29.');
      return;
    }
    setBusy(true);
    setError(null);
    const err = await addRating(memberId, {
      rating: ratingNum,
      source,
      asOf: asOf.trim(),
      note: note.trim() ? note.trim() : null,
    });
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
      title={`Add rating — ${memberName}`}
      onClose={onClose}
      onSubmit={submit}
      submitLabel="Add"
      busy={busy}
      error={error}
      submitDisabled={!valid}>
      <TextField
        label="Rating"
        value={rating}
        onChangeText={setRating}
        keyboardType="numeric"
        placeholder="3.456"
        hint="DUPR-style, e.g. 3.456"
      />
      <ChipSelect label="Source" options={SOURCES} value={source} onChange={setSource} />
      <TextField label="As of" value={asOf} onChangeText={setAsOf} placeholder="2026-08-29" hint="Date format: YYYY-MM-DD" />
      <TextField label="Note (optional)" value={note} onChangeText={setNote} placeholder="Post-tournament update" />
    </FormModal>
  );
}
