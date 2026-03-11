# Odyssey — Subscriptions & Services Reference
Last updated: March 11, 2026

Every external service the platform depends on. Keep this up to date when adding
or removing services. All keys are stored in Vercel Environment Variables (not in .env.local).

---

## CORE INFRASTRUCTURE

### 1. Supabase — Database & Authentication
- **What it does:** Hosts the entire database (leads, orgs, appointments, etc.) + handles user login/sessions
- **Plans:** Free (pauses after 7 days inactivity) → Pro $25/mo → Team $599/mo
- **Recommendation:** Pro plan required before first paying customer
- **Dashboard:** https://supabase.com/dashboard
- **Keys needed:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- **Billing cycle:** Monthly
- **If it goes down:** The entire app stops working. All data is inaccessible.

---

### 2. Vercel — Hosting & Deployment
- **What it does:** Hosts the Next.js app, handles deployments, manages environment variables
- **Plans:** Hobby (free, no custom domains on subpaths) → Pro $20/mo/seat → Team plans
- **Recommendation:** Pro plan for custom domain + team access + analytics
- **Dashboard:** https://vercel.com/dashboard
- **Keys needed:** None (Vercel manages its own auth — you log in via GitHub/email)
- **Billing cycle:** Monthly
- **If it goes down:** The website and all API routes are unreachable.

---

## COMMUNICATIONS

### 3. Resend — Transactional Email
- **What it does:** Sends all emails — lead notifications, auto-replies, review requests, sequences
- **Plans:** Free (3,000 emails/mo, 1 domain) → Pro $20/mo (50,000 emails) → Scale $90/mo
- **Recommendation:** Free is fine to start. Move to Pro when you hit 10+ active clients.
- **Dashboard:** https://resend.com
- **Keys needed:**
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL` (e.g. leads@hakondigital.com — must be a verified domain)
- **Domain verification:** You must verify your sending domain in Resend dashboard → Domains
- **Billing cycle:** Monthly
- **If it goes down:** No emails sent. Leads won't receive confirmation. You won't get notified of new leads.

---

### 4. Twilio — SMS & Call Tracking
- **What it does:** Sends SMS messages, provisions phone numbers for call tracking, records calls, transcribes voicemails
- **Plans:** Pay-as-you-go (no monthly fee, charged per use)
- **Typical costs:**
  - SMS (outbound AU): ~$0.065/message
  - Phone number rental: ~$1.15/number/month
  - Call recording: ~$0.0025/min storage
  - Voice calls: ~$0.022/min
- **Dashboard:** https://console.twilio.com
- **Keys needed:**
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER` (your provisioned number)
- **Billing cycle:** Pay-as-you-go, charged to card on file
- **If it goes down:** No SMS sending. Call tracking stops. Incoming call recording fails.
- **Cost watch:** Each client provisioning a call tracking number = ~$1.15/mo recurring per number. Factor into your pricing.

---

## AI & INTELLIGENCE

### 5. OpenAI — AI Features
- **What it does:** Powers all AI features — lead qualification, chat widget, strategy planner, daily game plan, ghost recovery, meeting briefings, objection handling, quote generation, follow-up writing
- **Plans:** Pay-as-you-go (API usage billing)
- **Model used:** GPT-4o (most features), GPT-4o-mini (lighter tasks)
- **Typical costs (estimates):**
  - GPT-4o: ~$2.50/1M input tokens, ~$10/1M output tokens
  - GPT-4o-mini: ~$0.15/1M input tokens, ~$0.60/1M output tokens
  - Light usage (10 clients): ~$5-15/mo
  - Medium usage (50 clients): ~$50-150/mo
- **Dashboard:** https://platform.openai.com
- **Keys needed:**
  - `OPENAI_API_KEY`
  - `AI_PROVIDER=openai`
- **Billing cycle:** Monthly, usage-based
- **IMPORTANT:** Set a monthly spend cap in OpenAI dashboard → Settings → Limits. Recommended: $50 cap to start.
- **If it goes down:** All AI features fail gracefully (rule-based fallback exists in code). App still works.

---

## PAYMENTS

### 6. Stripe — Billing & Subscriptions
- **What it does:** Handles all customer billing — plan upgrades, subscription management, payment processing
- **Plans:** No monthly fee. Stripe charges 2.9% + $0.30 per successful transaction (AU rates may differ slightly)
- **Dashboard:** https://dashboard.stripe.com
- **Keys needed:**
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET` ← currently blank, needs to be set
  - `STRIPE_STARTER_PRICE_ID`
  - `STRIPE_PRO_PRICE_ID`
  - `STRIPE_ENTERPRISE_PRICE_ID`
- **Billing cycle:** Stripe takes their cut per transaction. No monthly fee.
- **URGENT:** `STRIPE_WEBHOOK_SECRET` is blank. Billing webhooks are unverified. Get this from Stripe Dashboard → Webhooks → your endpoint → Signing secret.
- **If it goes down:** New signups can't pay. Existing subscriptions still run (Stripe handles renewals independently).

---

## SECURITY & BOT PROTECTION

### 7. Cloudflare Turnstile — CAPTCHA / Bot Protection
- **What it does:** Protects login and signup forms from bots and brute force attacks
- **Plans:** Free (unlimited requests)
- **Dashboard:** https://dash.cloudflare.com → Turnstile
- **Keys needed:**
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  - `TURNSTILE_SECRET_KEY`
- **Current status:** Using test keys (1x000...) — works in dev but must be replaced with real keys before production
- **To get real keys:** Cloudflare Dashboard → Turnstile → Add Site → copy Site Key + Secret Key
- **Billing cycle:** Free
- **If it goes down:** Forms fall back to no bot protection (code fails open, not closed — check this).

---

## DATA & TOOLS

### 8. OpenWeatherMap — Weather Campaigns
- **What it does:** Powers the weather-triggered campaign feature — sends targeted messages when weather conditions match (e.g. storm warnings for roofers)
- **Plans:** Free (1,000 calls/day) → Paid plans from $40/mo
- **Dashboard:** https://openweathermap.org/api
- **Keys needed:**
  - `OPENWEATHER_API_KEY`
- **Billing cycle:** Free tier should be sufficient for early scale
- **If it goes down:** Weather campaign feature fails. Rest of app unaffected.

---

## RECOMMENDED — NOT YET SET UP

These services are not currently integrated but are needed before production.

### 9. Upstash Redis — Rate Limiting
- **What it does:** Prevents API abuse and spam on public endpoints (lead forms, booking, AI chat)
- **Plans:** Free (10,000 commands/day) → Pay-as-you-go after that
- **Dashboard:** https://console.upstash.com
- **Why needed:** Currently there is zero rate limiting on public endpoints — a must before launch
- **Keys needed (once set up):**
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`

---

### 10. Sentry — Error Monitoring
- **What it does:** Captures errors in production with full stack traces, alerts you when something breaks
- **Plans:** Free (5,000 errors/mo) → Team $26/mo
- **Dashboard:** https://sentry.io
- **Why needed:** Right now errors only go to console logs you'll never see in production
- **Setup:** `npx @sentry/wizard@latest -i nextjs`

---

### 11. Uptime Monitor — BetterUptime or UptimeRobot
- **What it does:** Pings your app every minute and sends you an SMS/email if it goes down
- **Plans:** Both have free tiers
- **Options:**
  - BetterUptime: https://betteruptime.com (free tier, nice UI)
  - UptimeRobot: https://uptimerobot.com (free tier, 5-min intervals)
- **Why needed:** You'll have no idea if the app goes down without this

---

## MONTHLY COST SUMMARY

| Service | Min Cost | At 10 Clients | At 50 Clients |
|---------|----------|--------------|--------------|
| Supabase | $0 (pauses) / $25 (Pro) | $25 | $25 |
| Vercel | $0 / $20 (Pro) | $20 | $20 |
| Resend | $0 | $0 | $20 |
| Twilio | Usage-based | ~$15 | ~$60 |
| OpenAI | Usage-based | ~$10 | ~$100 |
| Stripe | % per transaction | ~$0 overhead | ~$0 overhead |
| Cloudflare Turnstile | Free | $0 | $0 |
| OpenWeatherMap | Free | $0 | $0 |
| Upstash Redis | Free | $0 | $0-5 |
| Sentry | Free | $0 | $0-26 |
| Uptime Monitor | Free | $0 | $0 |
| **TOTAL (estimated)** | **$45-50/mo base** | **~$70/mo** | **~$250/mo** |

*Stripe fees (2.9% + $0.30/transaction) are not included above — pass these through to customers via your plan pricing.*

---

## KEY ROTATION LOG
Use this to track when keys were last rotated.

| Service | Last Rotated | Rotated By | Notes |
|---------|-------------|-----------|-------|
| Supabase Service Role | - | - | Rotate ASAP |
| Supabase Anon Key | - | - | Rotate ASAP |
| OpenAI | - | - | Rotate ASAP |
| Resend | - | - | Rotate ASAP |
| Twilio Account SID / Auth Token | - | - | Rotate ASAP |
| Stripe Secret Key (live) | - | - | Rotate ASAP |
| Stripe Publishable Key (live) | - | - | Rotate ASAP |
| OpenWeather | - | - | Rotate ASAP |
| Cloudflare Turnstile | Never set | - | Set up real keys |
| Stripe Webhook Secret | Never set | - | Set this up now |
