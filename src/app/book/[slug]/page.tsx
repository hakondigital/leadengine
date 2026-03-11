'use client';

import { use, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BookingWidget } from '@/components/booking/booking-widget';
import { Calendar, Loader2 } from 'lucide-react';

export default function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function lookupOrg() {
      const supabase = createClient();
      const { data } = await supabase
        .from('organizations')
        .select('id, name, logo_url')
        .eq('slug', slug)
        .single();

      if (data) {
        setOrgId(data.id);
        setOrgName(data.name);
        setOrgLogo(data.logo_url);
      }
      setLoading(false);
    }
    lookupOrg();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--od-bg-primary)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--od-accent)]" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="min-h-screen bg-[var(--od-bg-primary)] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-[var(--od-text-primary)]">
            Booking page not found
          </h1>
          <p className="text-sm text-[var(--od-text-tertiary)] mt-2">
            This booking link is invalid or the organisation doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--od-bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          {orgLogo ? (
            <img
              src={orgLogo}
              alt={orgName || 'Logo'}
              className="h-10 mx-auto mb-4 object-contain"
            />
          ) : (
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--od-accent-muted)] border border-[rgba(79,209,229,0.2)] mb-4">
              <Calendar className="w-6 h-6 text-[var(--od-accent)]" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-[var(--od-text-primary)] tracking-tight">
            Book with {orgName || 'Us'}
          </h1>
          <p className="text-sm text-[var(--od-text-tertiary)] mt-1.5 max-w-sm mx-auto">
            Pick a date and time that works for you. We&apos;ll confirm your appointment.
          </p>
        </div>

        {/* Booking card */}
        <div className="rounded-[var(--od-radius-xl)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)] p-6 sm:p-8 shadow-[var(--od-shadow-lg)]">
          <BookingWidget
            organizationId={orgId}
            orgName={orgName || 'Us'}
            duration={30}
          />
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-[var(--od-text-muted)] mt-6">
          Powered by Odyssey
        </p>
      </div>
    </div>
  );
}
