'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { useAppointments } from '@/hooks/use-appointments';
import { usePlan } from '@/hooks/use-plan';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from 'lucide-react';

interface Appointment {
  id: string;
  leadName: string;
  service: string;
  date: string;
  time: string;
  duration: number;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  location: string;
  dayIndex: number;
  hour: number;
}

const mockAppointments: Appointment[] = [
  { id: '1', leadName: 'Sarah Mitchell', service: 'Kitchen Renovation Quote', date: '2026-03-09', time: '9:00 AM', duration: 60, status: 'confirmed', location: '42 Oak Street', dayIndex: 0, hour: 9 },
  { id: '2', leadName: 'James Cooper', service: 'Electrical Inspection', date: '2026-03-09', time: '11:30 AM', duration: 45, status: 'pending', location: '18 Elm Avenue', dayIndex: 0, hour: 11 },
  { id: '3', leadName: 'Lisa Wang', service: 'Bathroom Remodel Consult', date: '2026-03-10', time: '2:00 PM', duration: 60, status: 'confirmed', location: '7 Pine Road', dayIndex: 1, hour: 14 },
  { id: '4', leadName: 'David Brooks', service: 'Roof Assessment', date: '2026-03-11', time: '10:00 AM', duration: 90, status: 'pending', location: '55 Maple Drive', dayIndex: 2, hour: 10 },
  { id: '5', leadName: 'Emma Taylor', service: 'Plumbing Estimate', date: '2026-03-12', time: '3:30 PM', duration: 30, status: 'confirmed', location: '23 Cedar Lane', dayIndex: 3, hour: 15 },
  { id: '6', leadName: 'Michael Chen', service: 'HVAC Installation Quote', date: '2026-03-13', time: '9:30 AM', duration: 60, status: 'confirmed', location: '91 Birch Court', dayIndex: 4, hour: 9 },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Confirmed', color: '#1F9B5A', bg: 'rgba(52,199,123,0.08)' },
  pending: { label: 'Pending', color: '#C48020', bg: 'rgba(240,160,48,0.08)' },
  completed: { label: 'Completed', color: '#4070D0', bg: 'rgba(91,141,239,0.08)' },
  cancelled: { label: 'Cancelled', color: '#C44E56', bg: 'rgba(232,99,108,0.08)' },
};

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const weekDates = ['Mar 9', 'Mar 10', 'Mar 11', 'Mar 12', 'Mar 13'];
const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

export default function AppointmentsPage() {
  const { organization } = useOrganization();
  const { appointments: fetchedAppointments, loading, updateAppointment } = useAppointments(organization?.id);
  const [appointments, setAppointments] = useState(mockAppointments);
  const [showEmpty, setShowEmpty] = useState(false);
  const { canUseAppointments, planName, loading: planLoading } = usePlan();

  if (planLoading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[var(--le-accent)] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!canUseAppointments) {
    return <UpgradeBanner feature="Appointments" requiredPlan="Professional" currentPlan={planName} />;
  }

  // Map hook data to local shape when available, fall back to mock data
  const activeAppointments: Appointment[] = fetchedAppointments.length > 0
    ? fetchedAppointments.map((a, i) => ({
        id: a.id,
        leadName: a.lead_name || a.title,
        service: a.title,
        date: a.scheduled_at.split('T')[0],
        time: new Date(a.scheduled_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }),
        duration: a.duration_minutes,
        status: a.status === 'scheduled' ? 'pending' as const : a.status === 'no_show' ? 'cancelled' as const : a.status,
        location: a.location || '',
        dayIndex: new Date(a.scheduled_at).getDay() - 1,
        hour: new Date(a.scheduled_at).getHours(),
      }))
    : appointments;

  const todayAppointments = activeAppointments.filter((a) => a.date === '2026-03-09');

  const handleAction = (id: string, action: 'confirm' | 'complete' | 'cancel') => {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: action === 'confirm' ? 'confirmed' : action === 'complete' ? 'completed' : 'cancelled' }
          : a
      )
    );
  };

  const formatHour = (h: number) => {
    if (h === 12) return '12 PM';
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--le-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--le-border-subtle)]">
        <div className="px-4 lg:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight">
              Appointments
            </h1>
            <p className="text-sm text-[var(--le-text-tertiary)] mt-0.5">
              Manage your schedule and upcoming bookings
            </p>
          </div>
          <Button size="sm">
            <Plus className="w-3.5 h-3.5" />
            Book New
          </Button>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 space-y-6">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[var(--le-text-muted)]">
            <div className="w-3 h-3 border-2 border-[var(--le-accent)] border-t-transparent rounded-full animate-spin" />
            Loading appointments...
          </div>
        )}
        {/* Week View */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--le-accent)]" />
                <CardTitle>Week View</CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-medium text-[var(--le-text-secondary)] px-2">
                  Mar 9 - Mar 13, 2026
                </span>
                <Button variant="ghost" size="icon-sm">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                {/* Day headers */}
                <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b border-[var(--le-border-subtle)] pb-2 mb-2">
                  <div />
                  {weekDays.map((day, i) => (
                    <div key={day} className="text-center">
                      <p className="text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider">{day}</p>
                      <p className="text-xs font-medium text-[var(--le-text-secondary)]">{weekDates[i]}</p>
                    </div>
                  ))}
                </div>
                {/* Time grid */}
                <div className="space-y-0">
                  {hours.map((hour) => (
                    <div key={hour} className="grid grid-cols-[60px_repeat(5,1fr)] h-12 border-b border-[var(--le-border-subtle)]/50">
                      <div className="text-[10px] text-[var(--le-text-muted)] pr-2 text-right pt-0.5">
                        {formatHour(hour)}
                      </div>
                      {[0, 1, 2, 3, 4].map((dayIdx) => {
                        const apt = activeAppointments.find(
                          (a) => a.dayIndex === dayIdx && a.hour === hour && a.status !== 'cancelled'
                        );
                        return (
                          <div key={dayIdx} className="border-l border-[var(--le-border-subtle)]/50 px-1 relative">
                            {apt && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute inset-x-1 top-0.5 rounded-md px-1.5 py-0.5 cursor-pointer"
                                style={{
                                  backgroundColor: statusConfig[apt.status].bg,
                                  borderLeft: `2px solid ${statusConfig[apt.status].color}`,
                                  height: `${(apt.duration / 60) * 48 - 4}px`,
                                }}
                              >
                                <p className="text-[10px] font-semibold text-[var(--le-text-primary)] truncate">
                                  {apt.leadName}
                                </p>
                                <p className="text-[9px] text-[var(--le-text-muted)] truncate">
                                  {apt.time}
                                </p>
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--le-accent)]" />
              <CardTitle>Today&apos;s Appointments</CardTitle>
              <Badge variant="accent" size="sm">{todayAppointments.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No appointments today"
                description="Your schedule is clear. Book a new appointment to get started."
                action={{ label: 'Book Appointment', onClick: () => {} }}
              />
            ) : (
              <div className="space-y-3">
                {todayAppointments.map((apt, i) => (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-[var(--le-radius-md)] border border-[var(--le-border-subtle)] hover:border-[var(--le-accent)]/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--le-bg-tertiary)]">
                        <Clock className="w-4 h-4 text-[var(--le-text-muted)]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--le-text-primary)]">{apt.leadName}</p>
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-[4px]"
                            style={{
                              backgroundColor: statusConfig[apt.status].bg,
                              color: statusConfig[apt.status].color,
                            }}
                          >
                            {statusConfig[apt.status].label}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--le-text-tertiary)]">{apt.service}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-[10px] text-[var(--le-text-muted)]">
                            <Clock className="w-3 h-3" />
                            {apt.time} ({apt.duration}min)
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-[var(--le-text-muted)]">
                            <MapPin className="w-3 h-3" />
                            {apt.location}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {apt.status === 'pending' && (
                        <Button variant="ghost" size="icon-sm" onClick={() => handleAction(apt.id, 'confirm')} title="Confirm">
                          <CheckCircle2 className="w-4 h-4 text-[#1F9B5A]" />
                        </Button>
                      )}
                      {(apt.status === 'confirmed' || apt.status === 'pending') && (
                        <Button variant="ghost" size="icon-sm" onClick={() => handleAction(apt.id, 'complete')} title="Complete">
                          <CheckCircle2 className="w-4 h-4 text-[#4070D0]" />
                        </Button>
                      )}
                      {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                        <Button variant="ghost" size="icon-sm" onClick={() => handleAction(apt.id, 'cancel')} title="Cancel">
                          <XCircle className="w-4 h-4 text-[#C44E56]" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
