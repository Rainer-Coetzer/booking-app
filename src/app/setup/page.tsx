import { redirect } from 'next/navigation';
import { hasAdmin } from '@/server/auth';
import SetupForm from './SetupForm';

export const metadata = { title: 'Set up', robots: { index: false } };

export default function SetupPage() {
  if (hasAdmin()) redirect('/admin/login');
  return (
    <main className="auth">
      <div className="setup-panel">
        <p className="eyebrow">First run</p>
        <h1 style={{ marginTop: '0.5rem' }}>Set up your booking page</h1>
        <p className="muted" style={{ marginTop: '0.75rem' }}>
          This creates the owner account. Services, hours, branding and email can all be changed afterwards.
        </p>
        <SetupForm needsToken={Boolean(process.env.SETUP_TOKEN)} />
      </div>
    </main>
  );
}
