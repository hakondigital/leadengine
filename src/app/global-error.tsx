'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0F1923', color: '#E8EDF2' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: '#8B9DB5', maxWidth: 400, marginBottom: 24 }}>
            {error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={reset}
            style={{ padding: '10px 24px', borderRadius: 8, background: '#4FD1E5', color: '#0F1923', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
