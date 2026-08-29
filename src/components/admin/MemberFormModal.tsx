import { useEffect, useState } from 'react';

import { useStore } from '@/data/store';
import { duesLabel, membershipLabel } from '@/lib/format';
import type { DuesStatus, Member, MembershipType } from '@/types';
import { ChipSelect, FormModal, TextField } from './form-kit';

const MEMBERSHIP_TYPES: readonly MembershipType[] = ['generic', 'family', 'admin'];
const DUES_STATUSES: readonly DuesStatus[] = ['active', 'past_due', 'none'];
const SKILL_RATINGS = ['2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0'] as const;

export function MemberFormModal({
  visible,
  initial,
  onClose,
}: {
  visible: boolean;
  initial?: Member | null;
  onClose: () => void;
}) {
  const { createMember, updateMember } = useStore();
  const editing = Boolean(initial);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [membership, setMembership] = useState<MembershipType>('generic');
  const [skill, setSkill] = useState<string>('3.0');
  const [dues, setDues] = useState<DuesStatus>('none');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(initial?.name ?? '');
    setEmail(initial?.email ?? '');
    setMembership(initial?.membershipType ?? 'generic');
    setSkill((initial?.skillRating ?? 3.0).toFixed(1));
    setDues(initial?.duesStatus ?? 'none');
    setError(null);
    setBusy(false);
  }, [visible, initial]);

  const valid = name.trim().length > 0 && email.includes('@');

  const submit = async () => {
    if (!valid) {
      setError('Add a name and a valid email.');
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      membershipType: membership,
      skillRating: Number(skill),
      duesStatus: dues,
    };
    const err = editing && initial ? await updateMember(initial.id, payload) : await createMember(payload);
    setBusy(false);
    if (err) {
      // The DB enforces one member per email per club — make that readable.
      setError(/duplicate|unique/i.test(err) ? 'A member with that email already exists.' : err);
      return;
    }
    onClose();
  };

  return (
    <FormModal
      visible={visible}
      title={editing ? 'Edit member' : 'Add member'}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={editing ? 'Save' : 'Add'}
      busy={busy}
      error={error}
      submitDisabled={!valid}>
      <TextField label="Name" value={name} onChangeText={setName} placeholder="Jordan Lee" autoCapitalize="words" />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="jordan@example.com"
        autoCapitalize="none"
      />
      <ChipSelect
        label="Membership"
        options={MEMBERSHIP_TYPES}
        value={membership}
        onChange={setMembership}
        renderLabel={membershipLabel}
      />
      <ChipSelect label="Skill rating" options={SKILL_RATINGS} value={skill} onChange={setSkill} />
      <ChipSelect
        label="Dues"
        options={DUES_STATUSES}
        value={dues}
        onChange={setDues}
        renderLabel={(d) => duesLabel(d).label}
      />
    </FormModal>
  );
}
