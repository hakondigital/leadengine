'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, MousePointerClick, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTour } from './tour-provider';
import type { TourStep } from '@/lib/tour-steps';

// Padding (px) around the highlighted element
const PADDING = 12;
const BORDER_RADIUS = 12;
// How many 200 ms ticks to attempt finding the target element
const MAX_POLLS = 25;
// Max spotlight height — clamp large elements so the spotlight stays useful
const MAX_SPOTLIGHT_H = 400;

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
  const [searching, setSearching] = useState(false);
  const targetRef = useRef<Element | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  const measure = useCallback((el: Element) => {
    const r = el.getBoundingClientRect();
    // Clamp height for large elements — keep the spotlight meaningful
    const h = Math.min(r.height, MAX_SPOTLIGHT_H);
    setRect({ top: r.top, left: r.left, width: r.width, height: h });
  }, []);

  // Use rAF-based remeasure for smooth tracking during scroll
  const remeasure = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (targetRef.current) measure(targetRef.current);
    });
  }, [measure]);

  useEffect(() => {
    // Cleanup previous
    roRef.current?.disconnect();
    if (pollRef.current) clearTimeout(pollRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    targetRef.current = null;
    setRect(null);

    if (!active || !currentStep?.target) {
      setSearching(false);
      return;
    }

    setSearching(true);

    const selector = `[data-tour="${currentStep.target}"]`;
    let attempts = 0;

    const poll = () => {
      const el = document.querySelector(selector);
      if (el) {
        targetRef.current = el;
        // Scroll into view first
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // Wait for scroll to finish, then measure and reveal
        setTimeout(() => {
          measure(el);
          setSearching(false);
        }, 500);
        // Watch for resize
        const ro = new ResizeObserver(remeasure);
        ro.observe(el);
        roRef.current = ro;
      } else if (attempts < MAX_POLLS) {
        attempts++;
        pollRef.current = setTimeout(poll, 200);
      } else {
        setSearching(false);
      }
    };

    poll();

    window.addEventListener('scroll', remeasure, true);
    window.addEventListener('resize', remeasure);

    return () => {
      roRef.current?.disconnect();
      if (pollRef.current) clearTimeout(pollRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', remeasure, true);
      window.removeEventListener('resize', remeasure);
    };
  }, [active, currentStep, measure, remeasure]);

  if (!active || !currentStep) return null;

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalSteps - 1;

  const tooltipCard = (
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
  );

  // ── No spotlight (step with target: null) → centred modal ──
  if (!currentStep.target) {
    return (
      <>
        <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm" />
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
          <motion.div
            key={`tour-modal-${currentStep.id}`}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto"
          >
            {tooltipCard}
          </motion.div>
        </div>
      </>
    );
  }

  // ── Spotlight mode ──
  const showSpotlight = !!rect && !searching;

  // Spotlight rect with padding
  const sTop = rect ? rect.top - PADDING : 0;
  const sLeft = rect ? rect.left - PADDING : 0;
  const sWidth = rect ? rect.width + PADDING * 2 : 0;
  const sHeight = rect ? rect.height + PADDING * 2 : 0;

  // Tooltip positioning — try right side of spotlight, then below, then above, then left
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const tooltipW = 360;
  const tooltipH = 380; // estimated max height

  let tooltipTop = 0;
  let tooltipLeft = 0;

  if (showSpotlight) {
    const gap = 16;

    // Prefer: position to the right of spotlight
    const rightSpace = vw - (sLeft + sWidth + gap);
    // Prefer: position below spotlight
    const belowSpace = vh - (sTop + sHeight + gap);
    // Prefer: position above spotlight
    const aboveSpace = sTop - gap;
    // Prefer: position to the left
    const leftSpace = sLeft - gap;

    if (rightSpace >= tooltipW) {
      // Right
      tooltipLeft = sLeft + sWidth + gap;
      tooltipTop = Math.max(gap, Math.min(sTop, vh - tooltipH - gap));
    } else if (belowSpace >= tooltipH) {
      // Below
      tooltipTop = sTop + sHeight + gap;
      tooltipLeft = Math.max(gap, Math.min(sLeft, vw - tooltipW - gap));
    } else if (aboveSpace >= tooltipH) {
      // Above
      tooltipTop = sTop - tooltipH - gap;
      tooltipLeft = Math.max(gap, Math.min(sLeft, vw - tooltipW - gap));
    } else if (leftSpace >= tooltipW) {
      // Left
      tooltipLeft = sLeft - tooltipW - gap;
      tooltipTop = Math.max(gap, Math.min(sTop, vh - tooltipH - gap));
    } else {
      // Fallback: bottom-right corner
      tooltipTop = Math.max(gap, vh - tooltipH - gap);
      tooltipLeft = Math.max(gap, vw - tooltipW - gap);
    }
  } else {
    tooltipTop = vh / 2 - tooltipH / 2;
    tooltipLeft = (vw - tooltipW) / 2;
  }

  return (
    <>
      {/* ── SVG overlay with cutout ── */}
      <svg
        className="fixed inset-0 z-[9998]"
        style={{ width: '100vw', height: '100vh', pointerEvents: 'all' }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White = visible overlay (dark) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black = cutout (transparent hole) */}
            {showSpotlight && (
              <rect
                x={sLeft}
                y={sTop}
                width={sWidth}
                height={sHeight}
                rx={BORDER_RADIUS}
                ry={BORDER_RADIUS}
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* The dark overlay with the mask applied */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.65)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* ── Spotlight border ring ── */}
      {showSpotlight && (
        <motion.div
          className="fixed z-[9999] rounded-xl"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            boxShadow: [
              '0 0 0 2px rgba(79,209,229,0.6), 0 0 12px 2px rgba(79,209,229,0.15)',
              '0 0 0 3px rgba(79,209,229,0.4), 0 0 24px 4px rgba(79,209,229,0.25)',
              '0 0 0 2px rgba(79,209,229,0.6), 0 0 12px 2px rgba(79,209,229,0.15)',
            ],
          }}
          transition={{
            opacity: { duration: 0.3 },
            boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
          }}
          style={{
            top: sTop,
            left: sLeft,
            width: sWidth,
            height: sHeight,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── Tooltip card ── */}
      <AnimatePresence>
        {(showSpotlight || !currentStep.target) && (
          <motion.div
            key={`tour-tooltip-${currentStep.id}`}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: tooltipTop,
              left: tooltipLeft,
              width: tooltipW,
              zIndex: 10000,
              pointerEvents: 'all',
            }}
          >
            {tooltipCard}
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
    <div className="bg-[var(--od-bg-secondary)] rounded-2xl border border-[var(--od-border-subtle)] shadow-2xl overflow-hidden w-[360px]">
      {/* Progress bar */}
      <div className="h-1 bg-[var(--od-bg-tertiary)]">
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

        {/* Action callout */}
        {step.action && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[rgba(79,209,229,0.07)] border border-[rgba(79,209,229,0.18)] mb-4">
            <MousePointerClick className="w-4 h-4 text-[var(--od-accent)] shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--od-text-primary)] leading-relaxed font-medium">
              {step.action}
            </p>
          </div>
        )}

        {/* Tip */}
        {step.tip && !step.action && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[rgba(91,141,239,0.06)] border border-[rgba(91,141,239,0.12)] mb-4">
            <Sparkles className="w-4 h-4 text-[var(--od-accent)] shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--od-text-secondary)] leading-relaxed">
              {step.tip}
            </p>
          </div>
        )}

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === currentIndex ? 16 : 4,
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
    </div>
  );
}
