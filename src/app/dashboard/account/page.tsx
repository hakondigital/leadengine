'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization } from '@/hooks/use-organization';
import { usePlan } from '@/hooks/use-plan';
import { createClient } from '@/lib/supabase/client';
import {
  User,
  Mail,
  Lock,
  Shield,
  CreditCard,
  Building2,
  LogOut,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

export default function AccountPage() {
  const router = useRouter();
  const { organization, user, loading } = useOrganization();
  const { planName, isSuperAdmin } = usePlan();

  const [authEmail, setAuthEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser?.email) setAuthEmail(authUser.email);
    });
  }, []);

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setPasswordSaving(true);
    setPasswordMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordMessage({ type: 'error', text: error.message });
    } else {
      setPasswordMessage({ type: 'success', text: 'Password updated successfully' });
      setNewPassword('');
      setConfirmPassword('');
    }
    setPasswordSaving(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    document.cookie = 'od_session_confirmed=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
          <div className="px-4 lg:px-6 py-4">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
        </header>
        <div className="px-4 lg:px-6 py-6 max-w-2xl space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">
            My Account
          </h1>
          <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
            Manage your profile, security, and preferences
          </p>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 max-w-2xl space-y-6">
        {/* Profile Overview */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[var(--od-accent)]" />
                <CardTitle>Profile</CardTitle>
              </div>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-3 rounded-lg bg-[var(--od-bg-tertiary)]">
                <div className="w-12 h-12 rounded-full bg-[var(--od-accent-muted)] flex items-center justify-center text-lg font-bold text-[var(--od-accent)]">
                  {(user?.full_name || authEmail || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--od-text-primary)]">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-sm text-[var(--od-text-muted)] truncate">
                    {authEmail}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isSuperAdmin && (
                    <Badge className="bg-purple-500/20 text-purple-400">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                  <Badge variant="default" className="capitalize">
                    {user?.role || 'member'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[var(--od-text-muted)]">Organization</p>
                  <p className="text-[var(--od-text-secondary)] font-medium">{organization?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-[var(--od-text-muted)]">Plan</p>
                  <p className="text-[var(--od-text-secondary)] font-medium">{planName}</p>
                </div>
                <div>
                  <p className="text-[var(--od-text-muted)]">Email</p>
                  <p className="text-[var(--od-text-secondary)] font-medium truncate">{authEmail}</p>
                </div>
                <div>
                  <p className="text-[var(--od-text-muted)]">Member since</p>
                  <p className="text-[var(--od-text-secondary)] font-medium">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Change Password */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#F0A030]" />
                <CardTitle>Change Password</CardTitle>
              </div>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="New Password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <Input
                label="Confirm Password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              {passwordMessage && (
                <div className={`flex items-center gap-2 text-sm ${passwordMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                  {passwordMessage.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  {passwordMessage.text}
                </div>
              )}
              <Button onClick={handlePasswordChange} disabled={passwordSaving || !newPassword}>
                {passwordSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Links */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                { label: 'Organization Settings', desc: 'Business name, notifications, branding', href: '/dashboard/settings', icon: Building2 },
                { label: 'Billing & Plans', desc: 'Manage subscription and payment', href: '/dashboard/billing', icon: CreditCard },
                ...(isSuperAdmin ? [{ label: 'Super Admin Panel', desc: 'Manage all organizations', href: '/dashboard/admin', icon: Shield }] : []),
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--od-bg-tertiary)] transition-colors group"
                >
                  <link.icon className="w-5 h-5 text-[var(--od-text-muted)]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--od-text-secondary)] group-hover:text-[var(--od-text-primary)] transition-colors">
                      {link.label}
                    </p>
                    <p className="text-xs text-[var(--od-text-muted)]">{link.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--od-text-muted)] group-hover:text-[var(--od-text-secondary)] transition-colors" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Danger Zone */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-red-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--od-text-secondary)]">Sign out of your account</p>
                  <p className="text-xs text-[var(--od-text-muted)]">You will need to log in again to access the dashboard</p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  {loggingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Logging out...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
