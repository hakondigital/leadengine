'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, MousePointerClick, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTour } from './tour-provider';
import type { TourStep } from '@/lib/tour-steps';

// Padding (px) around the highlighted element
const PADDING = 10;
// How many 200 ms ticks to attempt finding the target element
const MAX_POLLS = 25;

interface ViewportRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// ─── Main overlay ──────────────────────────────────────────────────────────────

export function TourOverlay() {
  const { active, currentStep, currentIndex, totalSteps, nextStep, prevStep, endTour } =
    useTour();

  const [rect, setRect] = useState<ViewportRect | null>(null);
  // True while navigating to a new page / polling for the target element.
  // Prevents the tooltip from jumping to screen-centre before the element is found.
  const [searching, setSearching] = useState(false);
  const targetRef = useRef<Element | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const measure = useCallback((el: Element) => {
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, []);

  const remeasure = useCallback(() => {
    if (targetRef.current) measure(targetRef.current);
  }, [measure]);

  useEffect(() => {
    // Cleanup previous
    roRef.current?.disconnect();
    if (pollRef.current) clearTimeout(pollRef.current);
    targetRef.current = null;
    setRect(null);

    if (!active || !currentStep?.target) {
      setSearching(false);
      return;
    }

    // Signal that we are looking for the new element — keeps the dark overlay
    // visible but hides the tooltip so it doesn't jump to screen centre.
    setSearching(true);

    const selector = `[data-tour="${currentStep.target}"]`;
    let attempts = 0;

    const poll = () => {
      const el = document.querySelector(selector);
      if (el) {
        targetRef.current = el;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Re-measure after scroll settles to get accurate viewport position
        setTimeout(() => {
          measure(el);
          setSearching(false);
        }, 400);
        const ro = new ResizeObserver(remeasure);
        ro.observe(el);
        roRef.current = ro;
      } else if (attempts < MAX_POLLS) {
        attempts++;
        pollRef.current = setTimeout(poll, 200);
      } else {
        // Give up — fall back to centred modal
        setSearching(false);
      }
    };

    poll();

    window.addEventListener('scroll', remeasure, true);
    window.addEventListener('resize', remeasure);

    return () => {
      roRef.current?.disconnect();
      if (pollRef.current) clearTimeout(pollRef.current);
      window.removeEventListener('scroll', remeasure, true);
      window.removeEventListener('resize', remeasure);
    };
  }, [active, currentStep, measure, remeasure]);

  if (!active || !currentStep) return null;

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalSteps - 1;

  // ── No spotlight (step with target: null) ──
  if (!currentStep.target) {
    return (
      <>
        <div className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm" />
        <AnimatePresence>
          <motion.div
            key={`tour-modal-${currentStep.id}`}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
          >
            <div className="pointer-events-auto">
              <TourTooltipCard
                step={currentStep}
                currentIndex={currentIndex}
                totalSteps={totalSteps}
                isFirst={isFirst}
                isLast={isLast}
                onNext={nextStep}
                onPrev={prevStep}
                onEnd={endTour}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </>
    );
  }

  // ── Spotlight mode ──
  const showSpotlight = !!rect && !searching;
  const sTop = rect ? rect.top - PADDING : 0;
  const sLeft = rect ? rect.left - PADDING : 0;
  const sWidth = rect ? rect.width + PADDING * 2 : 0;
  const sHeight = rect ? rect.height + PADDING * 2 : 0;

  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const tooltipH = 360;
  const tooltipW = 360;
  const belowFits = showSpotlight && sTop + sHeight + 16 + tooltipH < vh;
  const aboveFits = showSpotlight && sTop - 16 - tooltipH > 0;
  const tooltipTop = showSpotlight
    ? belowFits
      ? sTop + sHeight + 16
      : aboveFits
        ? sTop - 16 - tooltipH
        : Math.max(16, Math.min(vh - tooltipH - 16, sTop + sHeight + 16))
    : vh / 2;
  const tooltipLeft = showSpotlight
    ? Math.min(Math.max(sLeft, 16), vw - tooltipW - 16)
    : (vw - tooltipW) / 2;

  return (
    <>
      {/* ── Dark overlay — always present while tour is active ── */}
      {showSpotlight ? (
        // Four panels creating the spotlight "frame"
        <div className="fixed inset-0 z-[9998]" style={{ pointerEvents: 'all' }}>
          {/* Top */}
          <div
            className="fixed bg-black/70"
            style={{ top: 0, left: 0, right: 0, height: Math.max(0, sTop) }}
          />
          {/* Bottom */}
          <div
            className="fixed bg-black/70"
            style={{ top: sTop + sHeight, left: 0, right: 0, bottom: 0 }}
          />
          {/* Left */}
          <div
            className="fixed bg-black/70"
            style={{
              top: Math.max(0, sTop),
              left: 0,
              width: Math.max(0, sLeft),
              height: sHeight,
            }}
          />
          {/* Right */}
          <div
            className="fixed bg-black/70"
            style={{
              top: Math.max(0, sTop),
              left: sLeft + sWidth,
              right: 0,
              height: sHeight,
            }}
          />
        </div>
      ) : (
        // Full-screen veil while searching for the element — prevents the
        // tooltip from snapping to centre between page navigations.
        <div
          className="fixed inset-0 z-[9998] bg-black/70"
          style={{ pointerEvents: 'all' }}
        />
      )}

      {/* ── Spotlight ring (accent border around the target) ── */}
      {showSpotlight && (
        <>
          {/* Solid ring */}
          <div
            className="fixed z-[9999] rounded-xl ring-2 ring-[var(--od-accent)]"
            style={{
              top: sTop,
              left: sLeft,
              width: sWidth,
              height: sHeight,
              pointerEvents: 'none',
            }}
          />
          {/* Pulsing glow ring — makes the spotlight unmistakably obvious */}
          <motion.div
            className="fixed z-[9999] rounded-xl"
            animate={{
              boxShadow: [
                '0 0 0 4px rgba(79,209,229,0.25), 0 0 16px 2px rgba(79,209,229,0.10)',
                '0 0 0 8px rgba(79,209,229,0.08), 0 0 32px 6px rgba(79,209,229,0.20)',
                '0 0 0 4px rgba(79,209,229,0.25), 0 0 16px 2px rgba(79,209,229,0.10)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              top: sTop,
              left: sLeft,
              width: sWidth,
              height: sHeight,
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      {/* ── Tooltip card — only animates in once the element is found ── */}
      <AnimatePresence>
        {showSpotlight && (
          <motion.div
            key={`tour-tooltip-${currentStep.id}`}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: tooltipTop,
              left: tooltipLeft,
              width: tooltipW,
              zIndex: 10000,
              pointerEvents: 'all',
            }}
          >
            <TourTooltipCard
              step={currentStep}
              currentIndex={currentIndex}
              totalSteps={totalSteps}
              isFirst={isFirst}
              isLast={isLast}
              onNext={nextStep}
              onPrev={prevStep}
              onEnd={endTour}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Tooltip card ──────────────────────────────────────────────────────────────

interface TourTooltipProps {
  step: TourStep;
  currentIndex: number;
  totalSteps: number;
  isFirst: boolean;
  isLast: boolean;
  onNext: () => void;
  onPrev: () => void;
  onEnd: () => void;
}

function TourTooltipCard({
  step,
  currentIndex,
  totalSteps,
  isFirst,
  isLast,
  onNext,
  onPrev,
  onEnd,
}: TourTooltipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="bg-[var(--od-bg-secondary)] rounded-2xl border border-[var(--od-border-subtle)] shadow-2xl overflow-hidden w-[360px]"
    >
      {/* Progress bar */}
      <div className="h-0.5 bg-[var(--od-bg-tertiary)]">
        <motion.div
          className="h-full bg-[var(--od-accent)]"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">
            Step {currentIndex + 1} of {totalSteps}
          </span>
          <button
            onClick={onEnd}
            className="p-1 rounded-md text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)] hover:bg-[var(--od-bg-tertiary)] transition-colors"
            aria-label="End tour"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-[var(--od-text-primary)] tracking-tight mb-2">
          {step.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-[var(--od-text-secondary)] leading-relaxed mb-3">
          {step.description}
        </p>

        {/* Action callout — what the user should do right now */}
        {step.action && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[rgba(79,209,229,0.07)] border border-[rgba(79,209,229,0.18)] mb-4">
            <MousePointerClick className="w-4 h-4 text-[var(--od-accent)] shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--od-text-primary)] leading-relaxed font-medium">
              {step.action}
            </p>
          </div>
        )}

        {/* Tip — shown only when there is no action */}
        {step.tip && !step.action && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[rgba(91,141,239,0.06)] border border-[rgba(91,141,239,0.12)] mb-4">
            <Sparkles className="w-4 h-4 text-[var(--od-accent)] shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--od-text-secondary)] leading-relaxed">
              {step.tip}
            </p>
          </div>
        )}

        {/* Step dots — centred */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === currentIndex ? 20 : 5,
                backgroundColor:
                  i === currentIndex
                    ? 'var(--od-accent)'
                    : i < currentIndex
                      ? 'rgba(79,209,229,0.4)'
                      : 'var(--od-border-subtle)',
              }}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrev}
            style={{ visibility: isFirst ? 'hidden' : 'visible' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {!isLast && (
              <button
                onClick={onEnd}
                className="text-xs text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)] transition-colors px-2 py-1"
              >
                Skip tour
              </button>
            )}
            <Button size="sm" onClick={onNext}>
              {isLast ? 'Finish' : 'Next'}
              {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
