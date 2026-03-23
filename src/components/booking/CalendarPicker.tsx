'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isBefore,
  isAfter,
  getDay,
} from 'date-fns';

interface Props {
  isCustom: boolean;
  selectedDate: string;
  onSelect: (date: string) => void;
  onBack: () => void;
}

export default function CalendarPicker({ isCustom, selectedDate, onSelect, onBack }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [closedDays, setClosedDays] = useState<Set<number>>(new Set());
  const today = new Date();

  useEffect(() => {
    // Fetch blocked dates
    fetch('/api/admin/blocked-dates')
      .then((r) => r.ok ? r.json() : { dates: [] })
      .then((data) => {
        const blocked = new Set<string>();
        (data.dates || []).forEach((d: { date: string }) => {
          blocked.add(d.date.split('T')[0]);
        });
        setBlockedDates(blocked);
      })
      .catch(() => {});

    // Fetch opening hours to know which days are closed
    fetch('/api/admin/hours')
      .then((r) => r.ok ? r.json() : { hours: [] })
      .then((data) => {
        const closed = new Set<number>();
        (data.hours || []).forEach((h: { day_of_week: number; enabled: boolean }) => {
          if (!h.enabled) closed.add(h.day_of_week);
        });
        setClosedDays(closed);
      })
      .catch(() => {});
  }, []);

  const isDayDisabled = useCallback(
    (date: Date) => {
      if (isBefore(date, today) && !isSameDay(date, today)) return true;
      if (blockedDates.has(format(date, 'yyyy-MM-dd'))) return true;
      if (!isCustom && closedDays.has(getDay(date))) return true;
      return false;
    },
    [blockedDates, closedDays, isCustom, today]
  );

  const renderDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = [];
    let day = startDate;

    while (!isAfter(day, endDate)) {
      const d = day;
      const dateStr = format(d, 'yyyy-MM-dd');
      const inMonth = isSameMonth(d, currentMonth);
      const disabled = !inMonth || isDayDisabled(d);
      const isSelected = selectedDate === dateStr;
      const isToday = isSameDay(d, today);

      let className = 'calendar-day';
      if (!inMonth) className += ' empty';
      else if (disabled) className += ' disabled';
      if (isSelected) className += ' selected';
      if (isToday && inMonth) className += ' today';
      if (isCustom && inMonth && !disabled) className += ' greyed';

      days.push(
        <button
          key={dateStr}
          className={className}
          disabled={disabled || !inMonth}
          onClick={() => !disabled && inMonth && onSelect(dateStr)}
          type="button"
        >
          {inMonth ? format(d, 'd') : ''}
        </button>
      );

      day = addDays(day, 1);
    }

    return days;
  };

  return (
    <div>
      <div className="step-header">
        <div className="step-label">Step 2</div>
        <h2 className="step-title">
          {isCustom ? 'Select Preferred Date' : 'Select a Date'}
        </h2>
        {isCustom && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Choose your preferred date — we'll confirm availability.
          </p>
        )}
      </div>

      <div className="calendar">
        <div className="calendar-nav">
          <button
            className="calendar-nav-btn"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            type="button"
          >
            ‹
          </button>
          <span className="calendar-month">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            className="calendar-nav-btn"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            type="button"
          >
            ›
          </button>
        </div>

        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="calendar-day-label">{d}</div>
          ))}
          {renderDays()}
        </div>
      </div>

      <div className="step-nav">
        <button className="btn" onClick={onBack} type="button">Back</button>
        <div />
      </div>
    </div>
  );
}
