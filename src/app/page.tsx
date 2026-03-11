'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Sparkles,
  Shield,
  BarChart3,
  Clock,
  Users,
  Mail,
  CheckCircle2,
  Zap,
  TrendingUp,
} from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'AI Lead Qualification',
    description: 'Every lead is automatically analysed, scored, and summarised so you know exactly who to call first.',
    color: '#4FD1E5',
  },
  {
    icon: Users,
    title: 'Smart Capture Forms',
    description: 'Multi-step, industry-specific forms that collect better data without feeling tedious.',
    color: '#5B8DEF',
  },
  {
    icon: BarChart3,
    title: 'Visual Pipeline',
    description: 'See every lead across your pipeline. Drag to update status. Never lose track of an opportunity.',
    color: '#8B7CF6',
  },
  {
    icon: Clock,
    title: 'Instant Notifications',
    description: 'Get premium email alerts the moment a lead comes in, with AI-generated priority tags.',
    color: '#4FD1E5',
  },
  {
    icon: Shield,
    title: 'White-Label Ready',
    description: 'Fully brandable for your business. Custom colours, logos, and industry templates.',
    color: '#34C77B',
  },
  {
    icon: Mail,
    title: 'Professional Emails',
    description: 'Beautiful confirmation emails for prospects. Premium notification emails for your team.',
    color: '#E8636C',
  },
];

const stats = [
  { label: 'Faster Response', value: '10x', icon: Zap },
  { label: 'More Conversions', value: '3x', icon: TrendingUp },
  { label: 'Leads Qualified', value: '50K+', icon: Users },
  { label: 'Time Saved', value: '20hrs/wk', icon: Clock },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#1C2A3A] text-white overflow-hidden">

      {/* ══════ HERO — Full viewport, dark with animated elements ══════ */}
      <section className="relative min-h-screen flex flex-col">

        {/* Animated background layer */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Gradient base */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#253A4E_0%,#1C2A3A_50%,#162536_100%)]" />

          {/* Animated gradient orbs */}
          <motion.div
            className="absolute w-[800px] h-[800px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(79,209,229,0.12) 0%, transparent 60%)', top: '-20%', left: '-10%' }}
            animate={{ x: [0, 80, -40, 0], y: [0, -50, 30, 0], scale: [1, 1.2, 0.9, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(91,141,239,0.1) 0%, transparent 60%)', bottom: '-10%', right: '-5%' }}
            animate={{ x: [0, -60, 40, 0], y: [0, 40, -30, 0], scale: [1, 0.85, 1.1, 1] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(139,124,246,0.08) 0%, transparent 60%)', top: '30%', right: '20%' }}
            animate={{ x: [0, 40, -50, 20, 0], y: [0, -30, 15, -25, 0] }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          />

          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'linear-gradient(rgba(79,209,229,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(79,209,229,0.3) 1px, transparent 1px)',
              backgroundSize: '80px 80px',
            }}
          />

          {/* Floating hexagons — dense, across entire hero */}
          {[
            { s: 160, t: '3%', l: '2%', d: 0, dur: 22, o: 0.04 },
            { s: 220, t: '5%', l: '70%', d: 3, dur: 28, o: 0.03 },
            { s: 100, t: '20%', l: '50%', d: 1, dur: 18, o: 0.05 },
            { s: 180, t: '30%', l: '85%', d: 5, dur: 26, o: 0.035 },
            { s: 130, t: '45%', l: '8%', d: 2, dur: 20, o: 0.04 },
            { s: 200, t: '50%', l: '55%', d: 4, dur: 30, o: 0.025 },
            { s: 80, t: '65%', l: '25%', d: 1, dur: 16, o: 0.05 },
            { s: 150, t: '70%', l: '78%', d: 6, dur: 24, o: 0.035 },
            { s: 120, t: '80%', l: '5%', d: 2, dur: 20, o: 0.04 },
            { s: 90, t: '10%', l: '35%', d: 7, dur: 14, o: 0.05 },
            { s: 170, t: '85%', l: '45%', d: 3, dur: 25, o: 0.03 },
            { s: 110, t: '38%', l: '30%', d: 8, dur: 19, o: 0.04 },
            { s: 70, t: '55%', l: '92%', d: 4, dur: 17, o: 0.05 },
            { s: 140, t: '15%', l: '15%', d: 6, dur: 23, o: 0.035 },
          ].map((h, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{ top: h.t, left: h.l, width: h.s, height: h.s }}
              animate={{ y: [0, -18, 10, -12, 0], x: [0, 12, -8, 15, 0], rotate: [0, 120, 240, 360] }}
              transition={{ duration: h.dur, repeat: Infinity, ease: 'linear', delay: h.d }}
            >
              <svg viewBox="0 0 100 100" fill="none" className="w-full h-full" style={{ opacity: h.o }}>
                <polygon points="50,2 93,25 93,75 50,98 7,75 7,25" stroke="#4FD1E5" strokeWidth="1" />
                <polygon points="50,18 78,33 78,67 50,82 22,67 22,33" stroke="#4FD1E5" strokeWidth="0.6" />
              </svg>
            </motion.div>
          ))}

          {/* Network mesh — lines + nodes across full screen */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            {[
              { x1: '5%', y1: '12%', x2: '22%', y2: '6%' },
              { x1: '22%', y1: '6%', x2: '45%', y2: '10%' },
              { x1: '45%', y1: '10%', x2: '68%', y2: '5%' },
              { x1: '68%', y1: '5%', x2: '90%', y2: '14%' },
              { x1: '8%', y1: '30%', x2: '28%', y2: '25%' },
              { x1: '28%', y1: '25%', x2: '50%', y2: '32%' },
              { x1: '50%', y1: '32%', x2: '75%', y2: '28%' },
              { x1: '75%', y1: '28%', x2: '95%', y2: '35%' },
              { x1: '3%', y1: '55%', x2: '18%', y2: '58%' },
              { x1: '18%', y1: '58%', x2: '40%', y2: '52%' },
              { x1: '40%', y1: '52%', x2: '65%', y2: '58%' },
              { x1: '65%', y1: '58%', x2: '88%', y2: '55%' },
              { x1: '10%', y1: '78%', x2: '32%', y2: '82%' },
              { x1: '32%', y1: '82%', x2: '55%', y2: '76%' },
              { x1: '55%', y1: '76%', x2: '80%', y2: '82%' },
              { x1: '80%', y1: '82%', x2: '96%', y2: '74%' },
              { x1: '5%', y1: '92%', x2: '25%', y2: '95%' },
              { x1: '25%', y1: '95%', x2: '50%', y2: '90%' },
              { x1: '50%', y1: '90%', x2: '75%', y2: '94%' },
              { x1: '75%', y1: '94%', x2: '95%', y2: '88%' },
              // Vertical connectors
              { x1: '22%', y1: '6%', x2: '28%', y2: '25%' },
              { x1: '45%', y1: '10%', x2: '40%', y2: '52%' },
              { x1: '68%', y1: '5%', x2: '75%', y2: '28%' },
              { x1: '90%', y1: '14%', x2: '95%', y2: '35%' },
              { x1: '18%', y1: '58%', x2: '32%', y2: '82%' },
              { x1: '65%', y1: '58%', x2: '55%', y2: '76%' },
              { x1: '88%', y1: '55%', x2: '80%', y2: '82%' },
              { x1: '50%', y1: '32%', x2: '40%', y2: '52%' },
              { x1: '28%', y1: '25%', x2: '18%', y2: '58%' },
              { x1: '75%', y1: '28%', x2: '65%', y2: '58%' },
              { x1: '10%', y1: '78%', x2: '5%', y2: '92%' },
              { x1: '55%', y1: '76%', x2: '50%', y2: '90%' },
            ].map((l, i) => (
              <motion.line
                key={`l-${i}`}
                x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke="#4FD1E5" strokeWidth="0.5" opacity="0.08"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: i * 0.08, ease: 'easeOut' }}
              />
            ))}

            {/* Nodes */}
            {[
              '5%,12%', '22%,6%', '45%,10%', '68%,5%', '90%,14%',
              '8%,30%', '28%,25%', '50%,32%', '75%,28%', '95%,35%',
              '3%,55%', '18%,58%', '40%,52%', '65%,58%', '88%,55%',
              '10%,78%', '32%,82%', '55%,76%', '80%,82%', '96%,74%',
              '5%,92%', '25%,95%', '50%,90%', '75%,94%', '95%,88%',
            ].map((pos, i) => {
              const [cx, cy] = pos.split(',');
              return (
                <motion.circle
                  key={`n-${i}`}
                  cx={cx} cy={cy} r="1.5"
                  fill="#4FD1E5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.25 }}
                  transition={{ duration: 0.3, delay: 0.5 + i * 0.06 }}
                />
              );
            })}

            {/* Pulsing highlight nodes */}
            {['45%,10%', '50%,32%', '40%,52%', '55%,76%', '28%,25%', '75%,28%'].map((pos, i) => {
              const [cx, cy] = pos.split(',');
              return (
                <motion.circle
                  key={`p-${i}`}
                  cx={cx} cy={cy} r="3"
                  fill="none" stroke="#4FD1E5" strokeWidth="0.8"
                  animate={{ opacity: [0, 0.3, 0], r: [3, 16, 16] }}
                  transition={{ duration: 3, delay: 1 + i * 2, repeat: Infinity, repeatDelay: 6 }}
                />
              );
            })}
          </svg>

          {/* Horizontal light streak */}
          <motion.div
            className="absolute h-[1px] top-[40%] left-0 right-0"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(79,209,229,0.15), transparent)' }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 4, repeat: Infinity, repeatDelay: 6 }}
          />
          <motion.div
            className="absolute h-[1px] top-[65%] left-0 right-0"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(91,141,239,0.1), transparent)' }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 4, delay: 3, repeat: Infinity, repeatDelay: 8 }}
          />

          {/* Bottom fade to content */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#1C2A3A] to-transparent" />
        </div>

        {/* Nav */}
        <nav className="relative z-20 flex items-center justify-between px-6 lg:px-12 py-5">
          <Image
            src="/odyssey-logo.png" unoptimized
            alt="Odyssey"
            width={200}
            height={56}
            className="h-20 lg:h-24 w-auto object-contain"
            priority
          />
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
            <Link href="/form/demo">
              <Button size="sm" className="bg-[#4FD1E5] text-[#0F1923] hover:bg-[#38BCD0] font-semibold">
                Try Demo
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl mx-auto text-center"
          >
            {/* Logo — big and prominent */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="mb-10 text-center"
            >
              <Image
                src="/odyssey-logo.png" unoptimized
                alt="Odyssey"
                width={700}
                height={190}
                className="h-52 sm:h-64 lg:h-80 w-auto object-contain mx-auto"
                priority
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-sm border border-white/[0.1] mb-8"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#4FD1E5]" />
              <span className="text-xs font-semibold text-[#4FD1E5] tracking-wide uppercase">
                AI-Powered Lead Intelligence
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.05] mb-6"
            >
              Stop missing leads.
              <br />
              <span className="bg-gradient-to-r from-[#4FD1E5] via-[#5BA8EF] to-[#8B7CF6] bg-clip-text text-transparent">
                Start closing them.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-base lg:text-lg text-white/50 max-w-2xl mx-auto leading-relaxed mb-10"
            >
              A premium lead capture and qualification platform built for service businesses.
              Capture smarter data, qualify leads with AI, and manage your pipeline — all in one place.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex items-center justify-center gap-4"
            >
              <Link href="/dashboard">
                <Button size="xl" className="bg-[#4FD1E5] text-[#0F1923] hover:bg-[#38BCD0] font-semibold shadow-[0_0_30px_rgba(79,209,229,0.25)]">
                  Open Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/form/demo">
                <Button size="xl" className="bg-white/[0.06] text-white border border-white/[0.12] hover:bg-white/[0.1] backdrop-blur-sm">
                  See Live Form
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="relative z-10 flex justify-center pb-8"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-5 h-8 rounded-full border border-white/20 flex justify-center pt-1.5">
            <motion.div
              className="w-1 h-2 rounded-full bg-[#4FD1E5]"
              animate={{ y: [0, 8, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* ══════ Stats bar ══════ */}
      <section className="relative z-10 border-y border-white/[0.06] bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <stat.icon className="w-5 h-5 text-[#4FD1E5] mx-auto mb-2" />
                <p className="text-2xl lg:text-3xl font-bold text-white tracking-tight">{stat.value}</p>
                <p className="text-xs text-white/40 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ Features ══════ */}
      <section className="relative z-10 px-6 lg:px-12 py-24">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-3">
              Built to convert, not just collect
            </h2>
            <p className="text-sm text-white/40 max-w-md mx-auto">
              Every feature is designed to help you capture more leads, understand them better, and respond faster.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300 group"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110"
                  style={{
                    backgroundColor: `${feature.color}15`,
                    border: `1px solid ${feature.color}25`,
                  }}
                >
                  <feature.icon className="w-5 h-5" style={{ color: feature.color }} />
                </div>
                <h3 className="text-sm font-semibold text-white/90 mb-1.5 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ Value prop ══════ */}
      <section className="relative z-10 px-6 lg:px-12 py-24 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-10">
              Better than a contact form.
              <br />
              Simpler than a CRM.
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-lg mx-auto">
              {[
                'Multi-step guided forms',
                'AI lead scoring & summaries',
                'Visual pipeline board',
                'Instant email notifications',
                'Industry-specific templates',
                'Mobile-optimised dashboard',
                'Drag-and-drop pipeline',
                'White-label ready',
              ].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2.5 py-2.5 px-3.5 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#34C77B] shrink-0" />
                  <span className="text-sm text-white/60">{item}</span>
                </motion.div>
              ))}
            </div>

            <div className="mt-12">
              <Link href="/dashboard">
                <Button size="xl" className="bg-[#4FD1E5] text-[#0F1923] hover:bg-[#38BCD0] font-semibold shadow-[0_0_30px_rgba(79,209,229,0.2)]">
                  Explore the Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════ Pricing ══════ */}
      <section className="relative z-10 px-6 lg:px-12 py-24 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-3">
              Simple, transparent pricing
            </h2>
            <p className="text-sm text-white/40 max-w-md mx-auto">
              Choose the plan that fits your business. Upgrade or downgrade anytime.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                name: 'Starter',
                price: 79,
                originalPrice: null as number | null,
                features: ['Up to 50 leads/month', 'AI lead qualification', 'Email notifications', '1 lead capture form', 'Basic analytics'],
              },
              {
                name: 'Professional',
                price: 149,
                originalPrice: null as number | null,
                popular: true,
                features: ['Up to 250 leads/month', 'AI qualification + follow-ups', 'Email & SMS notifications', '3 forms, 3 users', 'Advanced analytics + AI tools', 'Full AI tools suite', 'Priority support'],
              },
              {
                name: 'Enterprise',
                price: 410,
                originalPrice: 550 as number | null,
                features: ['Unlimited leads', 'Full AI suite (all features)', 'White-label branding', 'Unlimited forms & users', 'Call recording & transcription', 'Dedicated account manager', 'SLA guarantee'],
              },
            ].map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-xl border p-6 ${
                  plan.popular
                    ? 'border-[#4FD1E5]/40 bg-white/[0.06] shadow-[0_0_30px_rgba(79,209,229,0.08)]'
                    : 'border-white/[0.08] bg-white/[0.03]'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#4FD1E5] text-[#0F1923] text-[10px] font-bold uppercase tracking-wider rounded-full">
                    Most Popular
                  </div>
                )}

                <h3 className="text-base font-semibold text-white/90 mb-4">{plan.name}</h3>

                <div className="mb-5">
                  {plan.originalPrice && (
                    <span className="text-base text-white/30 line-through mr-2">${plan.originalPrice}</span>
                  )}
                  <span className="text-3xl font-bold text-white">${plan.price}</span>
                  <span className="text-sm text-white/40">/mo</span>
                  {plan.originalPrice && (
                    <div className="mt-1.5">
                      <span className="text-[10px] font-semibold text-[#34C77B] bg-[#34C77B]/10 px-2 py-0.5 rounded-full">
                        Save ${plan.originalPrice - plan.price}/mo
                      </span>
                    </div>
                  )}
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-white/50">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#34C77B] shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link href="/dashboard/billing">
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? 'bg-[#4FD1E5] text-[#0F1923] hover:bg-[#38BCD0] font-semibold'
                        : 'bg-white/[0.06] text-white border border-white/[0.12] hover:bg-white/[0.1]'
                    }`}
                  >
                    Get Started
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ CTA ══════ */}
      <section className="relative z-10 px-6 lg:px-12 py-24 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Image
              src="/odyssey-logo.png" unoptimized
              alt="Odyssey"
              width={240}
              height={66}
              className="h-36 w-auto object-contain mx-auto mb-8"
            />
            <h2 className="text-xl lg:text-2xl font-bold tracking-tight mb-4">
              Ready to capture more leads?
            </h2>
            <p className="text-sm text-white/40 max-w-md mx-auto mb-8">
              Set up your dashboard in 60 seconds. No credit card required.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="xl" className="bg-[#4FD1E5] text-[#0F1923] hover:bg-[#38BCD0] font-semibold shadow-[0_0_30px_rgba(79,209,229,0.25)]">
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="xl" className="bg-white/[0.06] text-white border border-white/[0.12] hover:bg-white/[0.1]">
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════ Footer ══════ */}
      <footer className="relative z-10 px-6 lg:px-12 py-10 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Image
            src="/odyssey-logo.png" unoptimized
            alt="Odyssey"
            width={140}
            height={38}
            className="h-16 w-auto object-contain"
          />
          <p className="text-[11px] text-white/30">
            Built by Hakon Digital
          </p>
        </div>
      </footer>
    </div>
  );
}
