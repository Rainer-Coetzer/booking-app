'use client';

import { useState } from 'react';
import type { BookingData } from './BookingWizard';

interface Props {
  booking: BookingData;
  isCustom: boolean;
  isSubmitting: boolean;
  error: string;
  onSubmit: (data: { name: string; email: string; phone: string; location: string; notes: string }) => void;
  onBack: () => void;
}

export default function ClientForm({ booking, isCustom, isSubmitting, error, onSubmit, onBack }: Props) {
  const [name, setName] = useState(booking.name);
  const [email, setEmail] = useState(booking.email);
  const [phone, setPhone] = useState(booking.phone);
  const [location, setLocation] = useState(booking.location);
  const [notes, setNotes] = useState(booking.notes);
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name || name.length < 2) e.name = 'Name must be at least 2 characters';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Valid email required';
    if (!phone || phone.length < 7) e.phone = 'Valid phone number required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return;
    if (!validate()) return;
    onSubmit({ name, email, phone, location, notes });
  };

  const stepNumber = isCustom ? 3 : 4;

  return (
    <div>
      <div className="step-header">
        <div className="step-label">Step {stepNumber}</div>
        <h2 className="step-title">Your Details</h2>
      </div>

      {error && <div className="login-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="ohnohoney">
          <input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
        </div>

        <div className="field-group">
          <label className="label" htmlFor="name">Full Name *</label>
          <input id="name" className={`input ${errors.name ? 'input-error' : ''}`} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" maxLength={100} />
          {errors.name && <div className="error-text">{errors.name}</div>}
        </div>

        <div className="field-group">
          <label className="label" htmlFor="email">Email *</label>
          <input id="email" className={`input ${errors.email ? 'input-error' : ''}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" maxLength={255} />
          {errors.email && <div className="error-text">{errors.email}</div>}
        </div>

        <div className="field-group">
          <label className="label" htmlFor="phone">Phone *</label>
          <input id="phone" className={`input ${errors.phone ? 'input-error' : ''}`} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+264 ..." maxLength={20} />
          {errors.phone && <div className="error-text">{errors.phone}</div>}
        </div>

        <div className="field-group">
          <label className="label" htmlFor="location">Location (optional)</label>
          <input id="location" className="input" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Preferred location" maxLength={255} />
        </div>

        <div className="field-group">
          <label className="label" htmlFor="notes">Notes (optional)</label>
          <textarea id="notes" className="input textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything you'd like us to know…" maxLength={1000} />
        </div>

        <div className="step-nav">
          <button type="button" className="btn" onClick={onBack} disabled={isSubmitting}>Back</button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : isCustom ? 'Request Quote' : 'Confirm Booking'}
          </button>
        </div>
      </form>
    </div>
  );
}
