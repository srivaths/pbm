import { useEffect, useState } from 'react';

import { useStore } from '@/data/store';
import type { EventTemplate, SkillLevel } from '@/types';
import { ChipSelect, FormModal, TextField } from './form-kit';

const SKILL_LEVELS: readonly SkillLevel[] = ['Any', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0'];

export function EventFormModal({
  visible,
  initial,
  onClose,
}: {
  visible: boolean;
  initial?: EventTemplate | null;
  onClose: () => void;
}) {
  const { createEvent, updateEvent } = useStore();
  const editing = Boolean(initial);

  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('60');
  const [skill, setSkill] = useState<SkillLevel>('Any');
  const [instructor, setInstructor] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form to the current target whenever the modal opens.
  useEffect(() => {
    if (!visible) return;
    setTitle(initial?.title ?? '');
    setDuration(String(initial?.durationMin ?? 60));
    setSkill(initial?.skillLevel ?? 'Any');
    setInstructor(initial?.instructor ?? '');
    setError(null);
    setBusy(false);
  }, [visible, initial]);

  const durationNum = Number(duration);
  const valid = title.trim().length > 0 && Number.isFinite(durationNum) && durationNum > 0;

  const submit = async () => {
    if (!valid) {
      setError('Add a title and a duration greater than 0.');
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      title: title.trim(),
      durationMin: Math.round(durationNum),
      skillLevel: skill,
      instructor: instructor.trim() ? instructor.trim() : null,
    };
    const err = editing && initial ? await updateEvent(initial.id, payload) : await createEvent(payload);
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
      title={editing ? 'Edit event' : 'New event'}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={editing ? 'Save' : 'Create'}
      busy={busy}
      error={error}
      submitDisabled={!valid}>
      <TextField label="Title" value={title} onChangeText={setTitle} placeholder="Open Play" autoCapitalize="words" />
      <TextField
        label="Duration (minutes)"
        value={duration}
        onChangeText={setDuration}
        keyboardType="number-pad"
        placeholder="60"
      />
      <ChipSelect
        label="Skill level"
        options={SKILL_LEVELS}
        value={skill}
        onChange={setSkill}
        renderLabel={(v) => (v === 'Any' ? 'Any' : `${v}+`)}
      />
      <TextField
        label="Instructor (optional)"
        value={instructor}
        onChangeText={setInstructor}
        placeholder="Coach Ana"
        autoCapitalize="words"
      />
    </FormModal>
  );
}
