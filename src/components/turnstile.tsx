'use client';

import { useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function Turnstile({ onVerify, onExpire }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current || !SITE_KEY) return;

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token: string) => onVerify(token),
        'expired-callback': () => onExpire?.(),
        theme: 'dark',
        size: 'flexible',
      });
    } catch {
      // Turnstile render failed — skip silently
    }
  }, [onVerify, onExpire]);

  useEffect(() => {
    // Don't load Turnstile if no real site key is configured
    if (!SITE_KEY) return;

    if (window.turnstile) {
      renderWidget();
      return;
    }

    const existingScript = document.querySelector('script[src*="turnstile"]');
    if (!existingScript) {
      window.onTurnstileLoad = renderWidget;
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
      script.async = true;
      document.head.appendChild(script);
    } else {
      const check = setInterval(() => {
        if (window.turnstile) {
          clearInterval(check);
          renderWidget();
        }
      }, 100);
      return () => clearInterval(check);
    }
  }, [renderWidget]);

  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup errors
        }
        widgetIdRef.current = null;
      }
    };
  }, []);

  // Don't render anything if Turnstile is not configured
  if (!SITE_KEY) return null;

  return <div ref={containerRef} className="mt-2" />;
}
