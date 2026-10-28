import { requireAdmin } from '@/server/auth';
import { requireSettings } from '@/server/settings';
import AdminNav from '@/components/admin/AdminNav';
import { signOut } from '../actions';

export const metadata = { robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const s = requireSettings();
  return (
    <div className="admin">
      <nav className="admin-nav" aria-label="Admin">
        <div className="admin-brand">{s.businessName}</div>
        <AdminNav />
        <form action={signOut}>
          <button type="submit" className="btn btn-quiet btn-sm">
            Sign out
          </button>
        </form>
      </nav>
      <main className="admin-main">{children}</main>
    </div>
  );
}
