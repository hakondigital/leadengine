'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowRight, LogOut, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Turnstile } from '@/components/turnstile';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [existingUser, setExistingUser] = useState<{ email: string } | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user?.email) {
          setExistingUser({ email: session.user.email });
        }
      })
      .catch(() => {
        // Auth check failed — just show login form
      })
      .finally(() => {
        setCheckingSession(false);
      });

    // Restore saved email
    try {
      const savedEmail = localStorage.getItem('le_saved_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // Clear session confirmation cookie
    document.cookie = 'le_session_confirmed=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    setExistingUser(null);
    setSigningOut(false);
  };

  const setSessionConfirmed = () => {
    // Set a session cookie (no expiry = cleared when browser closes)
    document.cookie = 'le_session_confirmed=1; path=/; SameSite=Lax';
  };

  const handleContinue = () => {
    setIsLoading(true);
    setSessionConfirmed();
    router.push('/dashboard');
  };

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Verify Turnstile token if configured (skip if using test keys)
    if (turnstileToken && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      const verifyRes = await fetch('/api/auth/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        setError('Security verification failed. Please try again.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message === 'Invalid login credentials') {
          setError('Incorrect email or password. Please try again.');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Please check your email and confirm your account first.');
        } else {
          setError(authError.message);
        }
        setIsLoading(false);
        return;
      }

      // Save or clear email based on "Remember me"
      try {
        if (rememberMe) {
          localStorage.setItem('le_saved_email', email);
        } else {
          localStorage.removeItem('le_saved_email');
        }
      } catch {
        // localStorage not available
      }

      setSessionConfirmed();
      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--le-bg-primary)] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-[#1C2A3A] relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#4FD1E5]/8 to-transparent" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-[#4FD1E5]/5 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-w-md px-12"
        >
          <div className="mb-8">
            <Image
              src="/logo.png" unoptimized
              alt="LeadEngine"
              width={200}
              height={56}
              className="h-12 w-auto object-contain"
              priority
            />
          </div>

          <h2 className="text-3xl font-bold text-white tracking-tight leading-tight mb-4">
            Never miss another lead.
          </h2>

          <p className="text-base text-[#8B9DB5] leading-relaxed">
            AI-powered lead capture, qualification, and pipeline management built for service businesses that want to convert more enquiries into paying work.
          </p>

          <div className="mt-10 space-y-4">
            {[
              'Smart multi-step capture forms',
              'AI-powered lead qualification',
              'Real-time notifications',
              'Visual pipeline management',
            ].map((feature, i) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-[#4FD1E5]/15 border border-[#4FD1E5]/25 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4FD1E5]" />
                </div>
                <span className="text-sm text-[#B0BEC5]">{feature}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-10">
            <Image
              src="/logo.png" unoptimized
              alt="LeadEngine"
              width={180}
              height={48}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>

          {checkingSession ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--le-text-muted)]" />
            </div>
          ) : existingUser ? (
            <>
              <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight mb-1">
                Welcome back
              </h1>
              <p className="text-sm text-[var(--le-text-tertiary)] mb-8">
                You have an active session
              </p>

              <div className="p-4 rounded-xl bg-[var(--le-bg-tertiary)] border border-[var(--le-border-subtle)] mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--le-accent-muted)] flex items-center justify-center text-sm font-bold text-[var(--le-accent)]">
                    {existingUser.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--le-text-primary)] truncate">
                      {existingUser.email}
                    </p>
                    <p className="text-xs text-[var(--le-text-muted)]">Signed in</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button size="lg" className="w-full" onClick={handleContinue} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading dashboard...
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4" />
                      Continue to Dashboard
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full text-[var(--le-text-muted)] hover:text-[#E8636C]"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing out...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      Sign out &amp; use different account
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight mb-1">
                Welcome back
              </h1>
              <p className="text-sm text-[var(--le-text-tertiary)] mb-8">
                Sign in to your dashboard
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  type="email"
                  label="Email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <Input
                  type="password"
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />

                {/* Remember me */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 rounded border border-[var(--le-border-subtle)] bg-[var(--le-bg-tertiary)] peer-checked:bg-[var(--le-accent)] peer-checked:border-[var(--le-accent)] transition-all flex items-center justify-center">
                      {rememberMe && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-[var(--le-text-secondary)] group-hover:text-[var(--le-text-primary)] transition-colors">
                    Remember my email
                  </span>
                </label>

                {/* Turnstile CAPTCHA */}
                <Turnstile onVerify={handleTurnstileVerify} onExpire={handleTurnstileExpire} />

                {error && (
                  <p className="text-sm text-[#E8636C]" role="alert">{error}</p>
                )}

                <Button type="submit" size="lg" className="w-full mt-2" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="text-xs text-[var(--le-text-muted)] text-center mt-6">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-[var(--le-accent-text)] hover:underline">
                  Sign up free
                </Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
