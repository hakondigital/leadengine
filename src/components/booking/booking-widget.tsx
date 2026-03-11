'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimeSlot {
  time: string;    // "09:00"
  display: string; // "9:00 AM"
}

interface BookingWidgetProps {
  organizationId: string;
  orgName: string;
  duration?: number; // minutes, default 30
}

export function BookingWidget({ organizationId, orgName, duration = 30 }: BookingWidgetProps) {
  const [step, setStep] = useState<'date' | 'time' | 'details' | 'confirmed'>('date');

  // Calendar
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [availableDays, setAvailableDays] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Time slots
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Contact form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch which days of the week have availability ───
  useEffect(() => {
    async function fetchDays() {
      try {
        const res = await fetch(
          `/api/public/book/availability?organization_id=${organizationId}`
        );
        if (res.ok) {
          const data = await res.json();
          setAvailableDays(data.available_days || []);
        }
      } catch {
        // silently fail
      }
    }
    fetchDays();
  }, [organizationId]);

  // ─── Fetch time slots when date is selected ───
  const fetchTimeSlots = useCallback(
    async (date: string) => {
      setLoadingSlots(true);
      setTimeSlots([]);
      try {
        const res = await fetch(
          `/api/public/book/availability?organization_id=${organizationId}&date=${date}&duration=${duration}`
        );
        if (res.ok) {
          const data = await res.json();
          setTimeSlots(data.time_slots || []);
        }
      } catch {
        // silently fail
      }
      setLoadingSlots(false);
    },
    [organizationId, duration]
  );

  const handleSelectDate = useCallback(
    (date: string) => {
      setSelectedDate(date);
      setSelectedSlot(null);
      fetchTimeSlots(date);
      setStep('time');
    },
    [fetchTimeSlots]
  );

  const handleSelectSlot = useCallback((slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep('details');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedDate || !selectedSlot || !name.trim() || !email.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const startTime = `${selectedDate}T${selectedSlot.time}:00`;
      const endMs = new Date(startTime).getTime() + duration * 60 * 1000;
      const endTime = new Date(endMs).toISOString();

      const res = await fetch('/api/public/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          start_time: startTime,
          end_time: endTime,
          contact_name: name.trim(),
          contact_email: email.trim(),
          contact_phone: phone.trim() || undefined,
          service_type: service.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Booking failed. Please try again.');
        return;
      }

      setStep('confirmed');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [selectedDate, selectedSlot, name, email, phone, service, notes, duration, organizationId]);

  // ─── Calendar helpers ───
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const calendarDays = useMemo(() => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: { date: Date; inMonth: boolean }[] = [];

    for (let i = 0; i < startDow; i++) {
      days.push({ date: new Date(year, month, -startDow + i + 1), inMonth: false });
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push({ date: new Date(year, month, i), inMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), inMonth: false });
    }

    return days;
  }, [currentMonth]);

  const isDateAvailable = useCallback(
    (date: Date) => {
      if (date < today) return false;
      return availableDays.includes(date.getDay());
    },
    [availableDays, today]
  );

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const canGoPrev =
    currentMonth.year > today.getFullYear() ||
    (currentMonth.year === today.getFullYear() && currentMonth.month > today.getMonth());

  const prevMonth = () =>
    setCurrentMonth((p) =>
      p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 }
    );
  const nextMonth = () =>
    setCurrentMonth((p) =>
      p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 }
    );

  const handleBack = () => {
    if (step === 'time') setStep('date');
    else if (step === 'details') setStep('time');
  };

  // ─── Step indicator ───
  const stepKeys = ['date', 'time', 'details', 'confirmed'];
  const stepIndex = stepKeys.indexOf(step);

  return (
    <div className="w-full">
      {/* Step indicator */}
      {step !== 'confirmed' && (
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {['Date', 'Time', 'Details'].map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i <= stepIndex
                    ? 'bg-[var(--od-accent)] text-white'
                    : 'bg-[var(--od-bg-tertiary)] text-[var(--od-text-muted)]'
                }`}
              >
                {i < stepIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              {i < 2 && (
                <div
                  className={`w-8 h-0.5 rounded-full ${
                    i < stepIndex ? 'bg-[var(--od-accent)]' : 'bg-[var(--od-bg-tertiary)]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ═══ STEP 1: DATE ═══ */}
        {step === 'date' && (
          <motion.div
            key="date"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-lg font-bold text-[var(--od-text-primary)] mb-1">
              Select a Date
            </h3>
            <p className="text-xs text-[var(--od-text-muted)] mb-4">
              Choose a day that works for you
            </p>

            {/* Month nav */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={prevMonth}
                disabled={!canGoPrev}
                className="p-1.5 rounded-lg hover:bg-[var(--od-bg-tertiary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-[var(--od-text-secondary)]" />
              </button>
              <span className="text-sm font-semibold text-[var(--od-text-primary)]">
                {monthNames[currentMonth.month]} {currentMonth.year}
              </span>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-[var(--od-bg-tertiary)] transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-[var(--od-text-secondary)]" />
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {dayLabels.map((d) => (
                <div
                  key={d}
                  className="text-center text-[10px] font-medium text-[var(--od-text-muted)] py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map(({ date, inMonth }, idx) => {
                const dateStr = fmt(date);
                const available = inMonth && isDateAvailable(date);
                const isToday = fmt(today) === dateStr;
                const isSelected = selectedDate === dateStr;

                return (
                  <button
                    key={idx}
                    onClick={() => available && handleSelectDate(dateStr)}
                    disabled={!available}
                    className={`
                      aspect-square flex items-center justify-center rounded-lg text-sm transition-all relative
                      ${!inMonth ? 'text-[var(--od-text-muted)]/30 cursor-default' : ''}
                      ${inMonth && !available ? 'text-[var(--od-text-muted)]/40 cursor-not-allowed' : ''}
                      ${available ? 'hover:bg-[var(--od-accent-muted)] cursor-pointer font-medium text-[var(--od-text-primary)]' : ''}
                      ${isSelected ? 'bg-[var(--od-accent)] text-white hover:bg-[var(--od-accent)]' : ''}
                      ${isToday && !isSelected ? 'ring-1 ring-[var(--od-accent)]' : ''}
                    `}
                  >
                    {date.getDate()}
                    {available && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--od-accent)]" />
                    )}
                  </button>
                );
              })}
            </div>

            {availableDays.length === 0 && (
              <p className="text-xs text-[var(--od-text-muted)] text-center mt-4 py-3 bg-[var(--od-bg-tertiary)] rounded-lg">
                No availability has been set up yet. Please contact us directly.
              </p>
            )}
          </motion.div>
        )}

        {/* ═══ STEP 2: TIME ═══ */}
        {step === 'time' && (
          <motion.div
            key="time"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-xs text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)] mb-3 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Change date
            </button>

            <h3 className="text-lg font-bold text-[var(--od-text-primary)] mb-1">
              Pick a Time
            </h3>
            <p className="text-xs text-[var(--od-text-muted)] mb-4">
              {selectedDate &&
                new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              {' \u00b7 '}
              {duration} min
            </p>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--od-accent)]" />
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="text-center py-8 bg-[var(--od-bg-tertiary)] rounded-lg">
                <Clock className="w-5 h-5 text-[var(--od-text-muted)] mx-auto mb-2" />
                <p className="text-sm text-[var(--od-text-muted)]">
                  No available times for this date
                </p>
                <button
                  onClick={handleBack}
                  className="text-xs text-[var(--od-accent)] mt-2 hover:underline"
                >
                  Try a different date
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => handleSelectSlot(slot)}
                    className={`
                      py-2.5 px-3 rounded-lg text-sm font-medium transition-all border
                      ${
                        selectedSlot?.time === slot.time
                          ? 'bg-[var(--od-accent)] text-white border-[var(--od-accent)]'
                          : 'border-[var(--od-border-subtle)] text-[var(--od-text-primary)] hover:border-[var(--od-accent)] hover:bg-[var(--od-accent-muted)]'
                      }
                    `}
                  >
                    {slot.display}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ STEP 3: DETAILS ═══ */}
        {step === 'details' && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-xs text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)] mb-3 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Change time
            </button>

            <h3 className="text-lg font-bold text-[var(--od-text-primary)] mb-1">
              Your Details
            </h3>
            <p className="text-xs text-[var(--od-text-muted)] mb-4">
              {selectedDate &&
                new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              {' at '}
              {selectedSlot?.display}
              {' \u00b7 '}
              {duration} min
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1 block">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-3 py-2.5 rounded-lg bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)] text-sm text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)] focus:border-[var(--od-accent)]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1 block">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-3 py-2.5 rounded-lg bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)] text-sm text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)] focus:border-[var(--od-accent)]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1 block">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0412 345 678"
                  className="w-full px-3 py-2.5 rounded-lg bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)] text-sm text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)] focus:border-[var(--od-accent)]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1 block">
                  Service Type
                </label>
                <input
                  type="text"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  placeholder="e.g. Consultation, Site Visit"
                  className="w-full px-3 py-2.5 rounded-lg bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)] text-sm text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)] focus:border-[var(--od-accent)]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1 block">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything we should know?"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)] text-sm text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)] focus:border-[var(--od-accent)] resize-none"
                />
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!name.trim() || !email.trim() || submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  'Confirm Booking'
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ═══ STEP 4: CONFIRMED ═══ */}
        {step === 'confirmed' && (
          <motion.div
            key="confirmed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-[rgba(52,199,123,0.1)] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-[#34C77B]" />
              </div>

              <h3 className="text-lg font-bold text-[var(--od-text-primary)] mb-1">
                Booking Confirmed!
              </h3>
              <p className="text-sm text-[var(--od-text-secondary)] mb-6">
                You&apos;re all set. We&apos;ll see you then.
              </p>

              <div className="bg-[var(--od-bg-tertiary)] rounded-xl p-4 text-left space-y-2.5">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--od-accent)] shrink-0" />
                  <span className="text-sm text-[var(--od-text-primary)]">
                    {selectedDate &&
                      new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--od-accent)] shrink-0" />
                  <span className="text-sm text-[var(--od-text-primary)]">
                    {selectedSlot?.display} ({duration} minutes)
                  </span>
                </div>
                {service && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[var(--od-accent)] shrink-0" />
                    <span className="text-sm text-[var(--od-text-primary)]">{service}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-[var(--od-text-muted)] mt-4">
                A confirmation has been sent to <strong className="text-[var(--od-text-secondary)]">{email}</strong>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
