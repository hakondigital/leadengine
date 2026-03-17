'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeam, type TeamMember } from '@/hooks/use-team';
import { useOrganization } from '@/hooks/use-organization';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import {
  Users,
  Plus,
  Mail,
  Shield,
  ShieldCheck,
  Crown,
  Loader2,
  X,
  Trash2,
  Check,
  UserPlus,
  Phone,
  Briefcase,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

const roleConfig = {
  owner: { label: 'Owner', icon: Crown, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  admin: { label: 'Admin', icon: ShieldCheck, color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
  member: { label: 'Member', icon: Shield, color: '#4FD1E5', bg: 'rgba(79,209,229,0.1)' },
};

export default function TeamPage() {
  const { members, loading, inviteMember, updateMember, removeMember } = useTeam();
  const { user } = useOrganization();
  const { success, error: showError } = useToast();
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', full_name: '', role: 'member', job_title: '' });

  const callerRole = user?.role || 'member';
  const canManage = callerRole === 'owner' || callerRole === 'admin';

  const handleInvite = async () => {
    if (!form.email.trim() || !form.full_name.trim()) return;
    setInviting(true);
    const { ok, error } = await inviteMember(form);
    setInviting(false);
    if (ok) {
      success(`Invitation sent to ${form.email}`);
      setForm({ email: '', full_name: '', role: 'member', job_title: '' });
      setShowInvite(false);
    } else {
      showError(error || 'Failed to invite');
    }
  };

  const handleRemove = async (id: string) => {
    const ok = await removeMember(id);
    if (ok) {
      success('Team member removed');
    }
    setConfirmDelete(null);
  };

  const toggleAvailability = async (member: TeamMember) => {
    await updateMember(member.id, { is_available: !member.is_available });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--od-accent)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--od-accent)]" />
                <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">
                  Team
                </h1>
              </div>
              <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </p>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setShowInvite(!showInvite)}>
                <UserPlus className="w-3.5 h-3.5" />
                Invite Member
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 space-y-6 max-w-4xl">
        {/* Invite form */}
        <AnimatePresence>
          {showInvite && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-[var(--od-text-primary)]">
                      Invite a Team Member
                    </h2>
                    <button
                      onClick={() => setShowInvite(false)}
                      className="p-1 rounded-md text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">
                        Full Name *
                      </label>
                      <Input
                        placeholder="e.g., Sarah Mitchell"
                        value={form.full_name}
                        onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">
                        Email Address *
                      </label>
                      <Input
                        type="email"
                        placeholder="sarah@company.com"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">
                        Role
                      </label>
                      <div className="flex gap-2">
                        {(['member', 'admin'] as const).map((r) => {
                          const rc = roleConfig[r];
                          const RIcon = rc.icon;
                          return (
                            <button
                              key={r}
                              onClick={() => setForm((p) => ({ ...p, role: r }))}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                                form.role === r
                                  ? 'border-[var(--od-accent)] bg-[var(--od-accent-muted)] text-[var(--od-accent)]'
                                  : 'border-[var(--od-border-subtle)] text-[var(--od-text-secondary)]'
                              }`}
                            >
                              <RIcon className="w-3.5 h-3.5" />
                              {rc.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">
                        Job Title (optional)
                      </label>
                      <Input
                        placeholder="e.g., Lead Electrician"
                        value={form.job_title}
                        onChange={(e) => setForm((p) => ({ ...p, job_title: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button size="sm" onClick={handleInvite} disabled={inviting || !form.email || !form.full_name}>
                      {inviting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Mail className="w-3.5 h-3.5" />
                      )}
                      {inviting ? 'Sending...' : 'Send Invite'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Team members list */}
        <div className="space-y-2">
          {members.map((member, i) => {
            const rc = roleConfig[member.role] || roleConfig.member;
            const RoleIcon = rc.icon;
            const isPending = member.id.startsWith && (member as unknown as { auth_id: string }).auth_id?.startsWith?.('pending_');

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="hover:border-[var(--od-accent)]/20 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ backgroundColor: rc.bg, color: rc.color }}
                        >
                          {member.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--od-text-primary)]">
                              {member.full_name}
                            </p>
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
                              style={{ color: rc.color, backgroundColor: rc.bg }}
                            >
                              <RoleIcon className="w-2.5 h-2.5" />
                              {rc.label}
                            </span>
                            {!member.is_active && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1 text-xs text-[var(--od-text-muted)]">
                              <Mail className="w-3 h-3" />
                              {member.email}
                            </span>
                            {member.job_title && (
                              <span className="flex items-center gap-1 text-xs text-[var(--od-text-muted)]">
                                <Briefcase className="w-3 h-3" />
                                {member.job_title}
                              </span>
                            )}
                            {member.phone && (
                              <span className="flex items-center gap-1 text-xs text-[var(--od-text-muted)]">
                                <Phone className="w-3 h-3" />
                                {member.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {/* Availability toggle */}
                        {canManage && member.role !== 'owner' && (
                          <button
                            onClick={() => toggleAvailability(member)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                              member.is_available
                                ? 'text-[#4ADE80] bg-[#4ADE80]/10'
                                : 'text-[var(--od-text-muted)] bg-[var(--od-bg-tertiary)]'
                            }`}
                            title={member.is_available ? 'Available for leads' : 'Unavailable'}
                          >
                            {member.is_available ? (
                              <ToggleRight className="w-3.5 h-3.5" />
                            ) : (
                              <ToggleLeft className="w-3.5 h-3.5" />
                            )}
                            {member.is_available ? 'Available' : 'Away'}
                          </button>
                        )}

                        {/* Remove */}
                        {canManage && member.role !== 'owner' && (
                          <>
                            {confirmDelete === member.id ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleRemove(member.id)}
                                >
                                  <Check className="w-3.5 h-3.5 text-red-400" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => setConfirmDelete(null)}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setConfirmDelete(member.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-[var(--od-text-muted)]" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {members.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-10 h-10 text-[var(--od-text-muted)] mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium text-[var(--od-text-secondary)]">No team members yet</p>
            <p className="text-xs text-[var(--od-text-muted)] mt-1">Invite your team to start collaborating</p>
          </div>
        )}
      </div>
    </div>
  );
}
