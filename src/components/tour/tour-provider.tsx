'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { TOUR_STEPS, type TourStep } from '@/lib/tour-steps';

interface TourContextValue {
  active: boolean;
  currentStep: TourStep | null;
  currentIndex: number;
  totalSteps: number;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used inside TourProvider');
  return ctx;
}

const STEP_KEY = 'od_tour_step';
const DONE_KEY = 'od_tour_done';

export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Restore in-progress tour on mount
  useEffect(() => {
    if (localStorage.getItem(DONE_KEY)) return;
    const saved = localStorage.getItem(STEP_KEY);
    if (saved !== null) {
      setCurrentIndex(parseInt(saved, 10));
      setActive(true);
    }
  }, []);

  const endTour = useCallback(() => {
    setActive(false);
    localStorage.removeItem(STEP_KEY);
    localStorage.setItem(DONE_KEY, '1');
  }, []);

  const startTour = useCallback(() => {
    localStorage.removeItem(DONE_KEY);
    localStorage.setItem(STEP_KEY, '0');
    setCurrentIndex(0);
    setActive(true);
  }, []);

  const nextStep = useCallback(() => {
    const next = currentIndex + 1;
    if (next >= TOUR_STEPS.length) {
      endTour();
      return;
    }
    localStorage.setItem(STEP_KEY, String(next));
    setCurrentIndex(next);
  }, [currentIndex, endTour]);

  const prevStep = useCallback(() => {
    const prev = Math.max(0, currentIndex - 1);
    localStorage.setItem(STEP_KEY, String(prev));
    setCurrentIndex(prev);
  }, [currentIndex]);

  // Navigate to the step's page when the step changes
  useEffect(() => {
    if (!active) return;
    const step = TOUR_STEPS[currentIndex];
    if (step && pathname !== step.page) {
      router.push(step.page);
    }
  }, [active, currentIndex, pathname, router]);

  const currentStep = active ? TOUR_STEPS[currentIndex] : null;

  return (
    <TourContext.Provider
      value={{
        active,
        currentStep,
        currentIndex,
        totalSteps: TOUR_STEPS.length,
        startTour,
        nextStep,
        prevStep,
        endTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}
