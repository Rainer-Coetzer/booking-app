'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PackageSelector from './PackageSelector';
import CalendarPicker from './CalendarPicker';
import TimeSlotGrid from './TimeSlotGrid';
import ClientForm from './ClientForm';
import Confirmation from './Confirmation';
import { SESSION_PACKAGES } from '@/lib/constants';
import type { SessionPackage } from '@/lib/constants';

export interface BookingData {
  sessionPackage: SessionPackage | null;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  notes: string;
}

const initialBooking: BookingData = {
  sessionPackage: null,
  date: '',
  time: '',
  name: '',
  email: '',
  phone: '',
  location: '',
  notes: '',
};

const stepVariants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

export default function BookingWizard() {
  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState<BookingData>(initialBooking);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; id?: number; isQuoteRequest?: boolean } | null>(null);
  const [error, setError] = useState('');

  const isCustom = booking.sessionPackage?.isCustom ?? false;
  const totalSteps = isCustom ? 4 : 5;

  const getActualStep = (displayStep: number) => {
    if (isCustom && displayStep >= 3) return displayStep + 1;
    return displayStep;
  };

  const handlePackageSelect = (pkg: SessionPackage) => {
    setBooking({ ...booking, sessionPackage: pkg, time: '' });
    setStep(2);
  };

  const handleDateSelect = (date: string) => {
    setBooking({ ...booking, date });
    if (isCustom) {
      setStep(3);
    } else {
      setStep(3);
    }
  };

  const handleTimeSelect = (time: string) => {
    setBooking({ ...booking, time });
    setStep(4);
  };

  const handleFormSubmit = async (formData: { name: string; email: string; phone: string; location: string; notes: string }) => {
    setBooking({ ...booking, ...formData });
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          session_type: booking.sessionPackage?.id,
          date: booking.date,
          time: isCustom ? null : booking.time,
          location: formData.location,
          notes: formData.notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setResult(data.booking);
      if (isCustom) {
        setStep(4);
      } else {
        setStep(5);
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const resetBooking = () => {
    setBooking(initialBooking);
    setStep(1);
    setResult(null);
    setError('');
  };

  const progressSteps = isCustom ? [1, 2, 3, 4] : [1, 2, 3, 4, 5];
  const isConfirmationStep = (isCustom && step === 4) || (!isCustom && step === 5);

  const renderStep = () => {
    if (isConfirmationStep) {
      return (
        <Confirmation
          booking={booking}
          isQuoteRequest={isCustom}
          onReset={resetBooking}
        />
      );
    }

    switch (step) {
      case 1:
        return (
          <PackageSelector
            packages={SESSION_PACKAGES}
            selected={booking.sessionPackage}
            onSelect={handlePackageSelect}
          />
        );
      case 2:
        return (
          <CalendarPicker
            isCustom={isCustom}
            selectedDate={booking.date}
            onSelect={handleDateSelect}
            onBack={goBack}
          />
        );
      case 3:
        if (isCustom) {
          return (
            <ClientForm
              booking={booking}
              isCustom={isCustom}
              isSubmitting={isSubmitting}
              error={error}
              onSubmit={handleFormSubmit}
              onBack={goBack}
            />
          );
        }
        return (
          <TimeSlotGrid
            date={booking.date}
            selectedTime={booking.time}
            onSelect={handleTimeSelect}
            onBack={goBack}
          />
        );
      case 4:
        return (
          <ClientForm
            booking={booking}
            isCustom={isCustom}
            isSubmitting={isSubmitting}
            error={error}
            onSubmit={handleFormSubmit}
            onBack={goBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="booking-container">
      <div className="booking-header">
        <h1>Book a Session</h1>
        <p>Select your preferred package and schedule a session</p>
      </div>

      {!isConfirmationStep && (
        <div className="progress-bar">
          {progressSteps.map((s) => (
            <div
              key={s}
              className={`progress-dot ${s === step ? 'active' : ''} ${s < step ? 'completed' : ''}`}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      <div style={{ textAlign: 'center', marginTop: '2rem', padding: '1rem', fontSize: '13px', color: 'var(--color-text-muted)' }}>
        Developed by Rainer Coetzer
      </div>
    </div>
  );
}
