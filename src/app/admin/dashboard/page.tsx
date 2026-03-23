'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, getDay } from 'date-fns';
import { DAYS_OF_WEEK, SESSION_PACKAGES } from '@/lib/constants';

type View = 'overview' | 'bookings' | 'calendar' | 'hours' | 'blocked' | 'create' | 'google';

interface Booking {
  id: number; name: string; email: string; phone: string; session_type: string;
  date: string; time: string | null; status: string; notes: string; location: string; created_at: string;
}

interface Stats { today: number; pending: number; quotes: number; thisMonth: number; }
interface OpeningHour { day_of_week: number; start_time: string; end_time: string; enabled: boolean; }
interface BlockedDate { id: number; date: string; reason: string; }

export default function AdminDashboard() {
  const router = useRouter();
  const [view, setView] = useState<View>('overview');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats>({ today: 0, pending: 0, quotes: 0, thisMonth: 0 });
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [hours, setHours] = useState<OpeningHour[]>([]);
  const [blocked, setBlocked] = useState<BlockedDate[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [calMonth, setCalMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);

  // New blocked date form
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');

  // Manual booking form  
  const [manualForm, setManualForm] = useState({ name: '', email: '', phone: '', session_type: 'couple', date: '', time: '', location: '', notes: '' });

  // Reschedule modal
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 401) { router.push('/admin/login'); return; }
      const data = await res.json();
      setStats(data.stats); setUpcoming(data.upcoming || []);
    } catch { /* */ }
  }, [router]);

  const fetchBookings = useCallback(async () => {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    const res = await fetch(`/api/admin/bookings${params}`);
    if (res.status === 401) { router.push('/admin/login'); return; }
    const data = await res.json();
    setBookings(data.bookings || []);
  }, [statusFilter, router]);

  const fetchHours = useCallback(async () => {
    const res = await fetch('/api/admin/hours');
    if (res.ok) { const data = await res.json(); setHours(data.hours || []); }
  }, []);

  const fetchBlocked = useCallback(async () => {
    const res = await fetch('/api/admin/blocked-dates');
    if (res.ok) { const data = await res.json(); setBlocked(data.dates || []); }
  }, []);

  const checkGoogle = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/google?action=status');
      if (res.ok) { const data = await res.json(); setGoogleConnected(data.connected); }
    } catch { /* */ }
  }, []);

  useEffect(() => {
    Promise.all([fetchStats(), fetchBookings(), fetchHours(), fetchBlocked(), checkGoogle()])
      .finally(() => setLoading(false));
  }, [fetchStats, fetchBookings, fetchHours, fetchBlocked, checkGoogle]);

  useEffect(() => { fetchBookings(); }, [statusFilter, fetchBookings]);

  const updateBooking = async (id: number, action: Record<string, unknown>) => {
    await fetch('/api/admin/bookings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...action }),
    });
    fetchBookings(); fetchStats();
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const handleUpdateHours = async (h: OpeningHour) => {
    await fetch('/api/admin/hours', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(h),
    });
    fetchHours();
  };

  const handleBlockDate = async () => {
    if (!newBlockDate) return;
    await fetch('/api/admin/blocked-dates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: newBlockDate, reason: newBlockReason }),
    });
    setNewBlockDate(''); setNewBlockReason('');
    fetchBlocked();
  };

  const handleUnblockDate = async (id: number) => {
    await fetch(`/api/admin/blocked-dates?id=${id}`, { method: 'DELETE' });
    fetchBlocked();
  };

  const handleManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manualForm),
    });
    setManualForm({ name: '', email: '', phone: '', session_type: 'couple', date: '', time: '', location: '', notes: '' });
    setView('bookings'); fetchBookings(); fetchStats();
  };

  const handleReschedule = async () => {
    if (!rescheduleBooking) return;
    await updateBooking(rescheduleBooking.id, { date: rescheduleDate, time: rescheduleTime || null });
    setRescheduleBooking(null);
  };

  const handleGoogleConnect = async () => {
    const res = await fetch('/api/admin/google?action=auth-url');
    const data = await res.json();
    if (data.url) window.open(data.url, '_blank');
  };

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
  };

  const getPkgName = (id: string) => SESSION_PACKAGES.find(p => p.id === id)?.name || id;

  if (loading) {
    return <div className="loading-overlay"><div className="spinner" /><div className="loading-text">Loading dashboard…</div></div>;
  }

  const navItems: { key: View; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'create', label: 'New Booking' },
    { key: 'hours', label: 'Hours' },
    { key: 'blocked', label: 'Blocked Dates' },
    { key: 'google', label: 'Google Calendar' },
  ];

  // Calendar view helpers
  const renderAdminCalendar = () => {
    const monthStart = startOfMonth(calMonth);
    const monthEnd = endOfMonth(calMonth);
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const cells = [];
    let day = start;

    while (day <= end) {
      const d = day;
      const dateStr = format(d, 'yyyy-MM-dd');
      const inMonth = isSameMonth(d, calMonth);
      const isToday = isSameDay(d, new Date());
      const dayBookings = bookings.filter(b => b.date?.split('T')[0] === dateStr);

      cells.push(
        <div key={dateStr} className={`admin-calendar-cell ${isToday ? 'today' : ''}`} style={{ opacity: inMonth ? 1 : 0.3 }}>
          <div className="day-number">{format(d, 'd')}</div>
          {dayBookings.map(b => (
            <span key={b.id} className={`booking-dot ${b.status}`} title={`${b.name} - ${b.status}`} />
          ))}
        </div>
      );
      day = addDays(day, 1);
    }
    return cells;
  };

  return (
    <div className="admin-layout">
      {/* Sidebar - Desktop */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">Studio <span>Admin</span></div>
        <nav>
          {navItems.map(item => (
            <button key={item.key} className={`admin-nav-item ${view === item.key ? 'active' : ''}`} onClick={() => setView(item.key)}>
              {item.label}
            </button>
          ))}
          <button className="admin-nav-item" onClick={handleLogout} style={{ marginTop: 'auto', color: 'var(--color-error)' }}>
            Sign Out
          </button>
        </nav>
      </aside>

      {/* Mobile Nav */}
      <div className="admin-mobile-nav">
        {navItems.map(item => (
          <button key={item.key} className={`admin-nav-item ${view === item.key ? 'active' : ''}`} onClick={() => setView(item.key)}>
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <main className="admin-content">
        {/* OVERVIEW */}
        {view === 'overview' && (
          <div>
            <div className="admin-page-header"><h1>Dashboard</h1><p>Overview of your studio bookings</p></div>
            <div className="stats-grid">
              <div className="stat-card"><div className="stat-label">Today</div><div className="stat-value">{stats.today}</div></div>
              <div className="stat-card"><div className="stat-label">Pending</div><div className="stat-value">{stats.pending}</div></div>
              <div className="stat-card"><div className="stat-label">Quote Requests</div><div className="stat-value">{stats.quotes}</div></div>
              <div className="stat-card"><div className="stat-label">This Month</div><div className="stat-value">{stats.thisMonth}</div></div>
            </div>
            {upcoming.length > 0 && (
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 400, marginBottom: 'var(--space-md)' }}>Upcoming Sessions</h2>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Client</th><th>Session</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
                    <tbody>
                      {upcoming.map(b => (
                        <tr key={b.id}>
                          <td>{b.name}</td>
                          <td>{getPkgName(b.session_type)}</td>
                          <td>{formatDate(b.date)}</td>
                          <td>{b.time || '—'}</td>
                          <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BOOKINGS */}
        {view === 'bookings' && (
          <div>
            <div className="admin-page-header"><h1>Bookings</h1><p>Manage all booking requests</p></div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
              {['', 'pending', 'confirmed', 'quote_requested', 'declined', 'cancelled'].map(s => (
                <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : ''}`} onClick={() => setStatusFilter(s)}>
                  {s || 'All'}
                </button>
              ))}
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Client</th><th>Email</th><th>Session</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td>{b.name}</td>
                      <td>{b.email}</td>
                      <td>{getPkgName(b.session_type)}</td>
                      <td>{formatDate(b.date)}</td>
                      <td>{b.time || '—'}</td>
                      <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                      <td>
                        <div className="actions">
                          {(b.status === 'pending' || b.status === 'quote_requested') && (
                            <button className="btn btn-sm btn-success" onClick={() => updateBooking(b.id, { status: 'confirmed' })}>Confirm</button>
                          )}
                          {b.status !== 'declined' && b.status !== 'cancelled' && (
                            <button className="btn btn-sm btn-danger" onClick={() => updateBooking(b.id, { status: 'declined' })}>Decline</button>
                          )}
                          {b.status !== 'cancelled' && (
                            <button className="btn btn-sm" onClick={() => { setRescheduleBooking(b); setRescheduleDate(b.date?.split('T')[0] || ''); setRescheduleTime(b.time || ''); }}>
                              Reschedule
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>No bookings found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CALENDAR VIEW */}
        {view === 'calendar' && (
          <div>
            <div className="admin-page-header"><h1>Calendar</h1><p>Monthly booking overview</p></div>
            <div className="calendar-nav" style={{ marginBottom: 'var(--space-lg)' }}>
              <button className="calendar-nav-btn" onClick={() => setCalMonth(subMonths(calMonth, 1))}>‹</button>
              <span className="calendar-month">{format(calMonth, 'MMMM yyyy')}</span>
              <button className="calendar-nav-btn" onClick={() => setCalMonth(addMonths(calMonth, 1))}>›</button>
            </div>
            <div className="calendar-grid" style={{ marginBottom: 'var(--space-sm)' }}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="calendar-day-label">{d}</div>)}
            </div>
            <div className="admin-calendar-grid">{renderAdminCalendar()}</div>
          </div>
        )}

        {/* MANUAL BOOKING */}
        {view === 'create' && (
          <div>
            <div className="admin-page-header"><h1>Create Booking</h1><p>Manually add a new booking</p></div>
            <form onSubmit={handleManualBooking} style={{ maxWidth: 500 }}>
              <div className="field-group"><label className="label">Name</label><input className="input" value={manualForm.name} onChange={e => setManualForm({ ...manualForm, name: e.target.value })} required /></div>
              <div className="field-group"><label className="label">Email</label><input className="input" type="email" value={manualForm.email} onChange={e => setManualForm({ ...manualForm, email: e.target.value })} required /></div>
              <div className="field-group"><label className="label">Phone</label><input className="input" value={manualForm.phone} onChange={e => setManualForm({ ...manualForm, phone: e.target.value })} required /></div>
              <div className="field-group">
                <label className="label">Session Type</label>
                <select className="input" value={manualForm.session_type} onChange={e => setManualForm({ ...manualForm, session_type: e.target.value })}>
                  {SESSION_PACKAGES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="field-group"><label className="label">Date</label><input className="input" type="date" value={manualForm.date} onChange={e => setManualForm({ ...manualForm, date: e.target.value })} required /></div>
              <div className="field-group"><label className="label">Time</label><input className="input" type="time" value={manualForm.time} onChange={e => setManualForm({ ...manualForm, time: e.target.value })} /></div>
              <div className="field-group"><label className="label">Location</label><input className="input" value={manualForm.location} onChange={e => setManualForm({ ...manualForm, location: e.target.value })} /></div>
              <div className="field-group"><label className="label">Notes</label><textarea className="input textarea" value={manualForm.notes} onChange={e => setManualForm({ ...manualForm, notes: e.target.value })} /></div>
              <button type="submit" className="btn btn-primary">Create Booking</button>
            </form>
          </div>
        )}

        {/* OPENING HOURS */}
        {view === 'hours' && (
          <div>
            <div className="admin-page-header"><h1>Opening Hours</h1><p>Manage available booking hours per day</p></div>
            {DAYS_OF_WEEK.map((day, i) => {
              const h = hours.find(x => x.day_of_week === i) || { day_of_week: i, start_time: '08:00', end_time: '18:00', enabled: false };
              return (
                <div key={i} className="hours-row">
                  <span className="hours-day">{day}</span>
                  <button type="button" className={`hours-toggle ${h.enabled ? 'enabled' : ''}`} onClick={() => handleUpdateHours({ ...h, enabled: !h.enabled })} />
                  <div className="hours-times">
                    <input type="time" className="hours-time-input" value={h.start_time} onChange={e => handleUpdateHours({ ...h, start_time: e.target.value })} disabled={!h.enabled} />
                    <span style={{ color: 'var(--color-text-muted)' }}>to</span>
                    <input type="time" className="hours-time-input" value={h.end_time} onChange={e => handleUpdateHours({ ...h, end_time: e.target.value })} disabled={!h.enabled} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BLOCKED DATES */}
        {view === 'blocked' && (
          <div>
            <div className="admin-page-header"><h1>Blocked Dates</h1><p>Block specific dates from bookings</p></div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="field-group" style={{ margin: 0 }}>
                <label className="label">Date</label>
                <input type="date" className="input" style={{ width: 180 }} value={newBlockDate} onChange={e => setNewBlockDate(e.target.value)} />
              </div>
              <div className="field-group" style={{ margin: 0 }}>
                <label className="label">Reason</label>
                <input className="input" style={{ width: 220 }} value={newBlockReason} onChange={e => setNewBlockReason(e.target.value)} placeholder="Holiday, etc." />
              </div>
              <button className="btn btn-primary" onClick={handleBlockDate}>Block Date</button>
            </div>
            <div className="blocked-list">
              {blocked.map(b => (
                <div key={b.id} className="blocked-item">
                  <div>
                    <div className="blocked-item-date">{formatDate(b.date)}</div>
                    {b.reason && <div className="blocked-item-reason">{b.reason}</div>}
                  </div>
                  <button className="btn btn-sm btn-danger" onClick={() => handleUnblockDate(b.id)}>Remove</button>
                </div>
              ))}
              {blocked.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No blocked dates</p>}
            </div>
          </div>
        )}

        {/* GOOGLE CALENDAR */}
        {view === 'google' && (
          <div>
            <div className="admin-page-header"><h1>Google Calendar</h1><p>Sync bookings with your Google Calendar</p></div>
            <div className="google-section">
              <div className="google-status">
                <span className={`google-dot ${googleConnected ? 'connected' : 'disconnected'}`} />
                <span>{googleConnected ? 'Connected' : 'Not connected'}</span>
              </div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 'var(--space-lg)' }}>
                {googleConnected
                  ? 'Your Google Calendar is synced. Confirmed bookings will automatically create calendar events.'
                  : 'Connect your Google account to automatically sync bookings to your calendar.'}
              </p>
              <button className="btn btn-primary" onClick={handleGoogleConnect}>
                {googleConnected ? 'Reconnect' : 'Connect Google Calendar'}
              </button>
            </div>
          </div>
        )}

        {/* RESCHEDULE MODAL */}
        {rescheduleBooking && (
          <div className="modal-overlay" onClick={() => setRescheduleBooking(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h2>Reschedule Booking</h2>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
                Rescheduling for {rescheduleBooking.name}
              </p>
              <div className="field-group">
                <label className="label">New Date</label>
                <input type="date" className="input" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} />
              </div>
              <div className="field-group">
                <label className="label">New Time</label>
                <input type="time" className="input" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button className="btn" onClick={() => setRescheduleBooking(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleReschedule}>Confirm Reschedule</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
