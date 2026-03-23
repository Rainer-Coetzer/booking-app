'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Slot {
  time: string;
  available: boolean;
  display: string;
}

interface Props {
  date: string;
  selectedTime: string;
  onSelect: (time: string) => void;
  onBack: () => void;
}

export default function TimeSlotGrid({ date, selectedTime, onSelect, onBack }: Props) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/slots?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        setSlots(data.slots || []);
        setLoading(false);
      })
      .catch(() => {
        setSlots([]);
        setLoading(false);
      });
  }, [date]);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <div className="loading-text">Loading available times…</div>
      </div>
    );
  }

  return (
    <div>
      <div className="step-header">
        <div className="step-label">Step 3</div>
        <h2 className="step-title">Select a Time</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {slots.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0' }}>
          No available slots for this date. Please select another date.
        </p>
      ) : (
        <div className="slots-grid">
          {slots.map((slot, i) => (
            <motion.button
              key={slot.time}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className={`slot-btn ${selectedTime === slot.time ? 'selected' : ''} ${!slot.available ? 'unavailable' : ''}`}
              onClick={() => slot.available && onSelect(slot.time)}
              disabled={!slot.available}
              type="button"
              id={`slot-${slot.time}`}
            >
              {slot.display}
            </motion.button>
          ))}
        </div>
      )}

      <div className="step-nav">
        <button className="btn" onClick={onBack} type="button">Back</button>
        <div />
      </div>
    </div>
  );
}
