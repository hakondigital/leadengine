'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[var(--le-bg-primary)]">
      <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
      <h2 className="text-lg font-semibold text-[var(--le-text-primary)] mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-[var(--le-text-muted)] max-w-md mb-4">
        {typeof error?.message === 'string' ? error.message : 'An unexpected error occurred. Please try again.'}
      </p>
      <Button onClick={reset}>
        <RefreshCw className="w-4 h-4" />
        Try Again
      </Button>
    </div>
  );
}
