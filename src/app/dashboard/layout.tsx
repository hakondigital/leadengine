import { Sidebar } from '@/components/dashboard/sidebar';
import { OnboardingAgent } from '@/components/dashboard/onboarding-agent';
import { AIChatWidget } from '@/components/dashboard/ai-chat-widget';
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
        <div className="flex min-h-screen bg-[var(--od-bg-primary)]">
          <Sidebar />
          <main className="flex-1 min-w-0 pb-20 lg:pb-0 flex flex-col">
            <DashboardPageTransition>
              {children}
            </DashboardPageTransition>
          </main>
          <OnboardingAgent />
          <TourOverlay />
          <AIChatWidget />
        </div>
      </TourProvider>
    </ToastProvider>
  );
}
