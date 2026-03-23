'use client';

import { motion } from 'framer-motion';
import type { BookingData } from './BookingWizard';
import { SESSION_PACKAGES } from '@/lib/constants';

interface Props {
  booking: BookingData;
  isQuoteRequest: boolean;
  onReset: () => void;
}

export default function Confirmation({ booking, isQuoteRequest, onReset }: Props) {
  const pkg = SESSION_PACKAGES.find((p) => p.id === booking.sessionPackage?.id);
  const dateDisplay = booking.date
    ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';

  return (
    <motion.div
      className="confirmation"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="confirmation-icon">{isQuoteRequest ? '📩' : '✓'}</div>
      <h2>{isQuoteRequest ? 'Quote Request Submitted' : 'Booking Confirmed'}</h2>
      <p>
        {isQuoteRequest
          ? "We've received your request. We'll be in touch with a personalized quote."
          : 'Your session has been booked. Check your email for confirmation details.'}
      </p>

      <div className="booking-summary">
        <div className="summary-row">
          <span className="summary-label">Session</span>
          <span className="summary-value">{pkg?.name}</span>
        </div>
        {!isQuoteRequest && (
          <div className="summary-row">
            <span className="summary-label">Price</span>
            <span className="summary-value">{pkg?.price}</span>
          </div>
        )}
        <div className="summary-row">
          <span className="summary-label">{isQuoteRequest ? 'Preferred Date' : 'Date'}</span>
          <span className="summary-value">{dateDisplay}</span>
        </div>
        {!isQuoteRequest && booking.time && (
          <div className="summary-row">
            <span className="summary-label">Time</span>
            <span className="summary-value">{booking.time}</span>
          </div>
        )}
        <div className="summary-row">
          <span className="summary-label">Name</span>
          <span className="summary-value">{booking.name}</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Email</span>
          <span className="summary-value">{booking.email}</span>
        </div>
      </div>

      <button className="btn" onClick={onReset} type="button">Book Another Session</button>
    </motion.div>
  );
}
