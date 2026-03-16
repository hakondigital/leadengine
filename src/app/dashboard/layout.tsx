import { Sidebar } from '@/components/dashboard/sidebar';
import { OnboardingWrapper } from '@/components/dashboard/onboarding-wrapper';
import { ToastProvider } from '@/components/ui/toast';
import { TourProvider } from '@/components/tour/tour-provider';
import { TourOverlay } from '@/components/tour/tour-overlay';
import { DashboardPageTransition } from '@/components/dashboard/page-transition';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <TourProvider>
        <div className="flex min-h-screen bg-[var(--od-bg-primary)] text-[var(--od-text-primary)]">
          <Sidebar />
          <main className="flex-1 min-w-0 pb-20 lg:pb-0 flex flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]">
            <DashboardPageTransition>
              {children}
            </DashboardPageTransition>
          </main>
          <OnboardingWrapper />
          <TourOverlay />
        </div>
      </TourProvider>
    </ToastProvider>
  );
}
