import { Sidebar } from '@/components/dashboard/sidebar';
import { OnboardingWrapper } from '@/components/dashboard/onboarding-wrapper';
import { ToastProvider } from '@/components/ui/toast';
import { TourProvider } from '@/components/tour/tour-provider';
import { TourOverlay } from '@/components/tour/tour-overlay';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <TourProvider>
        <div className="flex min-h-screen bg-[var(--od-bg-primary)]">
          <Sidebar />
          <main className="flex-1 min-w-0 pb-20 lg:pb-0">
            {children}
          </main>
          <OnboardingWrapper />
          <TourOverlay />
        </div>
      </TourProvider>
    </ToastProvider>
  );
}
