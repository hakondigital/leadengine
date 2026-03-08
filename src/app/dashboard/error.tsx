'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
      <h2 className="text-lg font-semibold text-[var(--le-text-primary)] mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-[var(--le-text-muted)] max-w-md mb-1">
        {typeof error?.message === 'string' ? error.message : 'An unexpected error occurred.'}
      </p>
      {error.digest && (
        <p className="text-xs text-[var(--le-text-muted)] mb-4 font-mono">
          Error ID: {error.digest}
        </p>
      )}
      <Button onClick={reset} className="mt-4">
        <RefreshCw className="w-4 h-4" />
        Try Again
      </Button>
    </div>
  );
}
