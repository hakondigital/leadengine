'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Turnstile } from '@/components/turnstile';

const industries = [
  { label: 'Electrical', value: 'electrical' },
  { label: 'Plumbing', value: 'plumbing' },
  { label: 'Building & Construction', value: 'building' },
  { label: 'Landscaping', value: 'landscaping' },
  { label: 'Painting', value: 'painting' },
  { label: 'HVAC / Air Conditioning', value: 'hvac' },
  { label: 'Roofing', value: 'roofing' },
  { label: 'Consulting', value: 'consulting' },
  { label: 'Property / Real Estate', value: 'property' },
  { label: 'Legal', value: 'legal' },
  { label: 'Other', value: 'other' },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Step 2: Business
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setNotificationEmail(email);
    setStep(2);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!businessName.trim() || !industry) {
      setError('Business name and industry are required');
      return;
    }

    // Verify Turnstile if configured
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

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Failed to create account');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_id: authData.user.id,
          email,
          full_name: fullName,
          business_name: businessName,
          industry,
          notification_email: notificationEmail || email,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to set up workspace');
        setIsLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--le-bg-primary)] flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-[#1C2A3A] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4FD1E5]/8 to-transparent" />
        <div className="absolute top-1/3 right-1/3 w-72 h-72 rounded-full bg-[#4FD1E5]/5 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
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
            Set up in 60 seconds.
            <br />
            Start capturing leads today.
          </h2>

          <p className="text-base text-[#8B9DB5] leading-relaxed">
            Create your account, tell us about your business, and get a premium lead capture system ready to embed on your website.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { step: 1, text: 'Create your account' },
              { step: 2, text: 'Set up your business' },
              { step: 3, text: 'Start capturing leads' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${
                  step >= item.step
                    ? 'bg-[#4FD1E5] text-white'
                    : 'bg-[#2F3E4F] text-[#6B7B8D]'
                }`}>
                  {item.step}
                </div>
                <span className={`text-sm transition-colors ${
                  step >= item.step ? 'text-white' : 'text-[#6B7B8D]'
                }`}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel — form */}
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

          {step === 1 ? (
            <>
              <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight mb-1">
                Create your account
              </h1>
              <p className="text-sm text-[var(--le-text-tertiary)] mb-8">
                Step 1 of 2 — your login details
              </p>

              <form onSubmit={handleStep1} className="space-y-4">
                <Input
                  label="Full Name"
                  placeholder="John Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <Input
                  type="email"
                  label="Email"
                  placeholder="john@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  label="Password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                {error && (
                  <p className="text-sm text-[#E8636C]" role="alert">{error}</p>
                )}

                <Button type="submit" size="lg" className="w-full mt-2">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight mb-1">
                Your business
              </h1>
              <p className="text-sm text-[var(--le-text-tertiary)] mb-8">
                Step 2 of 2 — we&apos;ll tailor your lead system
              </p>

              <form onSubmit={handleSignup} className="space-y-4">
                <Input
                  label="Business Name"
                  placeholder="Smith Electrical"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
                <SelectField
                  label="Industry"
                  placeholder="Select your industry..."
                  options={industries}
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  required
                />
                <Input
                  type="email"
                  label="Lead Notification Email"
                  placeholder="Where should we send new leads?"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  hint="New lead alerts will go here"
                />

                {/* Turnstile CAPTCHA */}
                <Turnstile onVerify={(t) => setTurnstileToken(t)} onExpire={() => setTurnstileToken(null)} />

                {error && (
                  <p className="text-sm text-[#E8636C]" role="alert">{error}</p>
                )}

                <Button type="submit" size="lg" className="w-full mt-2" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating your workspace...
                    </>
                  ) : (
                    <>
                      Create Workspace
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => { setStep(1); setError(''); }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </Button>
              </form>
            </>
          )}

          <p className="text-xs text-[var(--le-text-muted)] text-center mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--le-accent-text)] hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
