'use client';

import { useActionState } from 'react';
import { Field } from '@/components/admin/Field';
import { signIn } from '../actions';

export default function LoginForm() {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form action={action}>
      {state.error && (
        <p className="notice notice-bad" role="alert" style={{ marginBottom: '1.5rem' }}>
          {state.error}
        </p>
      )}
      <Field name="email" label="Email" type="email" autoComplete="email" required />
      <Field name="password" label="Password" type="password" autoComplete="current-password" required />
      <button type="submit" className="btn btn-primary" disabled={pending} style={{ marginTop: '1.75rem', width: '100%' }}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
