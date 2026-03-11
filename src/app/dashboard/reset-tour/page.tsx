'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTour } from '@/components/tour/tour-provider';

// Dev utility — visit /dashboard/reset-tour to immediately start the interactive tour.
// Bypasses the welcome modal and Supabase onboarding_completed flag entirely.
export default function ResetTourPage() {
  const { startTour } = useTour();
  const router = useRouter();

  useEffect(() => {
    startTour();
    router.replace('/dashboard');
  }, [startTour, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-[var(--od-text-muted)]">Starting tour...</p>
    </div>
  );
}
