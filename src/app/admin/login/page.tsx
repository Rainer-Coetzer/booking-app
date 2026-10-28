import { redirect } from 'next/navigation';
import { currentAdmin, hasAdmin } from '@/server/auth';
import { getSettings } from '@/server/settings';
import LoginForm from './LoginForm';

export const metadata = { title: 'Sign in', robots: { index: false } };

export default async function LoginPage() {
  if (!hasAdmin()) redirect('/setup');
  if (await currentAdmin()) redirect('/admin');
  return (
    <main className="auth">
      <div className="auth-panel">
        <p className="eyebrow">{getSettings()?.businessName}</p>
        <h1 style={{ marginTop: '0.5rem' }}>Sign in</h1>
        <LoginForm />
      </div>
    </main>
  );
}
