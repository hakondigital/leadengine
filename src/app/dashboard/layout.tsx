import { Sidebar } from '@/components/dashboard/sidebar';
import { OnboardingWrapper } from '@/components/dashboard/onboarding-wrapper';
import { ToastProvider } from '@/components/ui/toast';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[var(--le-bg-primary)]">
        <Sidebar />
        <main className="flex-1 min-w-0 pb-20 lg:pb-0">
          {children}
        </main>
        <OnboardingWrapper />
      </div>
    </ToastProvider>
  );
}
