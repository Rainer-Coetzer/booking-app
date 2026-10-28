'use client';

import { useActionState } from 'react';
import { sendTestEmail, type FormState } from '../../actions';

export default function TestEmailButton() {
  const [state, action, pending] = useActionState<FormState>(sendTestEmail, {});
  return (
    <form action={action} className="row" style={{ marginTop: '1rem' }}>
      <button type="submit" className="btn btn-sm" disabled={pending}>
        {pending ? 'Sending…' : 'Send a test email'}
      </button>
      {state.message && <span className="muted small" role="status">{state.message}</span>}
      {state.error && <span className="error" role="alert">{state.error}</span>}
    </form>
  );
}
