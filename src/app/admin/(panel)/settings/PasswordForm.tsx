'use client';

import { useActionState } from 'react';
import { Field } from '@/components/admin/Field';
import { updatePassword, type FormState } from '../../actions';

export default function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(updatePassword, {});
  const f = state.fields ?? {};
  return (
    <form action={action} style={{ maxWidth: '26rem' }}>
      {state.message && <p className="notice" role="status" style={{ marginBottom: '1rem' }}>{state.message}</p>}
      <Field name="current" label="Current password" type="password" autoComplete="current-password" error={f.current} required />
      <Field name="next" label="New password" type="password" autoComplete="new-password" minLength={12} hint="At least 12 characters." error={f.next} required />
      <button type="submit" className="btn" disabled={pending} style={{ marginTop: '1.25rem' }}>
        Change password
      </button>
    </form>
  );
}
