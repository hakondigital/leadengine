const SUPA_URL = 'https://ztsqoouklctojhbzodvs.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0c3Fvb3VrbGN0b2poYnpvZHZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc5MzgyNiwiZXhwIjoyMDg4MzY5ODI2fQ.u9EpWBQ5FKR6zgtvB4_RbKp8IIt-Khimtnq3rcL-yiI';
const ORG_ID = '6767c50a-c1f0-4793-bc92-26b44b132477';

const h = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ' + SUPA_KEY,
  'apikey': SUPA_KEY,
  'Prefer': 'return=representation',
};

const post = async (table, body) => {
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, { method: 'POST', headers: h, body: JSON.stringify(body) });
  return r.json();
};

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const daysFromNow = (n) => new Date(Date.now() + n * 86400000).toISOString();

// ── LEADS ────────────────────────────────────────────────────────────────────
const leadsData = [
  { first_name: 'James', last_name: 'Mitchell', email: 'james.mitchell@email.com', phone: '0412345678', service_type: 'Full House Repaint', status: 'won', ai_score: 92, message: 'Repeat customer, referred 2 others. 4-bed double storey.', source: 'google_ads', location: 'Mosman NSW', budget_range: '4500-6000', created_at: daysAgo(45) },
  { first_name: 'Sarah', last_name: 'Chen', email: 'sarah.chen@gmail.com', phone: '0423456789', service_type: 'Kitchen Renovation', status: 'proposal', ai_score: 85, message: 'Ready to proceed, waiting on final quote approval.', source: 'facebook', location: 'Neutral Bay NSW', budget_range: '12000-18000', created_at: daysAgo(12) },
  { first_name: 'Marcus', last_name: 'Thompson', email: 'm.thompson@hotmail.com', phone: '0434567890', service_type: 'Deck Installation', status: 'qualified', ai_score: 78, message: 'Timeline flexible, prefers weekends for site visits.', source: 'website', location: 'Manly NSW', budget_range: '8000-11000', created_at: daysAgo(8) },
  { first_name: 'Priya', last_name: 'Sharma', email: 'priya.sharma@work.com', phone: '0445678901', service_type: 'Bathroom Renovation', status: 'new', ai_score: 71, message: 'First enquiry, needs callback within 24 hours.', source: 'instagram', location: 'Chatswood NSW', budget_range: '15000-22000', created_at: daysAgo(1) },
  { first_name: 'Tom', last_name: 'Reynolds', email: 'treynolds@gmail.com', phone: '0456789012', service_type: 'Fence and Gate', status: 'contacted', ai_score: 63, message: 'Comparing 3 quotes. Needs quick turnaround.', source: 'referral', location: 'Cremorne NSW', budget_range: '3200-4500', created_at: daysAgo(6) },
  { first_name: 'Emma', last_name: 'Wilson', email: 'emma.w@icloud.com', phone: '0467890123', service_type: 'Roof Restoration', status: 'won', ai_score: 88, message: 'Insurance job approved. Smooth process, great client.', source: 'google_ads', location: 'North Sydney NSW', budget_range: '9500-13000', created_at: daysAgo(30) },
  { first_name: 'David', last_name: 'Park', email: 'dpark@outlook.com', phone: '0478901234', service_type: 'Landscaping', status: 'lost', ai_score: 44, message: 'Went with competitor on price. Follow up in 6 months.', source: 'facebook', location: 'Lane Cove NSW', budget_range: '6000-8000', created_at: daysAgo(20) },
  { first_name: 'Lucy', last_name: 'Hart', email: 'lucy.hart@email.com', phone: '0489012345', service_type: 'Interior Painting', status: 'qualified', ai_score: 80, message: 'Moving in 6 weeks, urgent timeline. Very motivated buyer.', source: 'website', location: 'Crows Nest NSW', budget_range: '2800-4200', created_at: daysAgo(4) },
  { first_name: 'Ahmed', last_name: 'Al-Farsi', email: 'ahmed.alfarsi@gmail.com', phone: '0490123456', service_type: 'Driveway Paving', status: 'proposal', ai_score: 76, message: 'Wants stamped concrete options. Budget already approved.', source: 'google_ads', location: 'St Leonards NSW', budget_range: '7500-10000', created_at: daysAgo(9) },
  { first_name: 'Claire', last_name: 'Morrison', email: 'cmorrison@work.com.au', phone: '0401234567', service_type: 'Pool Fencing', status: 'new', ai_score: 68, message: 'Council compliance deadline end of month. Urgent job.', source: 'referral', location: 'Kirribilli NSW', budget_range: '4000-6500', created_at: daysAgo(2) },
  { first_name: 'Ben', last_name: 'Crawford', email: 'ben.c@icloud.com', phone: '0412987654', service_type: 'Full House Repaint', status: 'contacted', ai_score: 59, message: 'Has photos ready to send. Wants quote this week.', source: 'instagram', location: 'Willoughby NSW', budget_range: '5000-7500', created_at: daysAgo(5) },
  { first_name: 'Sophie', last_name: 'Turner', email: 'sophie.turner@gmail.com', phone: '0423876543', service_type: 'Kitchen Renovation', status: 'won', ai_score: 95, message: 'High value job, excellent communication. Left 5-star Google review.', source: 'google_ads', location: 'Balmoral NSW', budget_range: '28000-35000', created_at: daysAgo(60) },
];

console.log('Inserting leads...');
const insertedLeads = [];
for (const lead of leadsData) {
  const result = await post('leads', { ...lead, organization_id: ORG_ID });
  if (Array.isArray(result) && result[0]) {
    insertedLeads.push(result[0]);
    console.log(`  ✓ ${result[0].first_name} ${result[0].last_name} (${result[0].status})`);
  }
}

// ── APPOINTMENTS ─────────────────────────────────────────────────────────────
const apptData = [
  { idx: 0, title: 'Site Visit — James Mitchell', days: -5, status: 'completed' },
  { idx: 1, title: 'Site Measure — Sarah Chen', days: -2, status: 'completed' },
  { idx: 2, title: 'Consultation — Marcus Thompson', days: 2, status: 'scheduled' },
  { idx: 3, title: 'Initial Visit — Priya Sharma', days: 4, status: 'scheduled' },
  { idx: 7, title: 'Quote Walkthrough — Lucy Hart', days: 1, status: 'scheduled' },
];

console.log('\nInserting appointments...');
for (const a of apptData) {
  const lead = insertedLeads[a.idx];
  if (!lead) continue;
  const start = new Date(Date.now() + a.days * 86400000);
  start.setHours(10, 0, 0, 0);
  await post('appointments', {
    organization_id: ORG_ID, lead_id: lead.id, title: a.title,
    start_time: start.toISOString(),
    end_time: new Date(start.getTime() + 3600000).toISOString(),
    status: a.status, notes: 'Measure up and discuss scope. Bring sample materials.',
  });
  console.log(`  ✓ ${a.title}`);
}

// ── QUOTES ───────────────────────────────────────────────────────────────────
const quoteData = [
  { idx: 0, service: 'Full House Repaint — Mosman', total: 5200, status: 'accepted' },
  { idx: 1, service: 'Kitchen Renovation — Neutral Bay', total: 15500, status: 'sent' },
  { idx: 5, service: 'Roof Restoration — North Sydney', total: 11200, status: 'accepted' },
  { idx: 8, service: 'Driveway Paving — St Leonards', total: 8800, status: 'sent' },
  { idx: 11, service: 'Kitchen Renovation — Balmoral', total: 31000, status: 'accepted' },
  { idx: 7, service: 'Interior Painting — Crows Nest', total: 3600, status: 'draft' },
];

console.log('\nInserting quotes...');
for (const q of quoteData) {
  const lead = insertedLeads[q.idx];
  if (!lead) continue;
  await post('quotes', {
    organization_id: ORG_ID, lead_id: lead.id, title: q.service,
    status: q.status, total_amount: q.total,
    valid_until: daysFromNow(14),
    notes: 'Includes all materials and labour. GST included.',
    line_items: [
      { description: 'Labour', quantity: 1, unit_price: Math.round(q.total * 0.6), total: Math.round(q.total * 0.6) },
      { description: 'Materials & supplies', quantity: 1, unit_price: Math.round(q.total * 0.35), total: Math.round(q.total * 0.35) },
      { description: 'Site cleanup', quantity: 1, unit_price: Math.round(q.total * 0.05), total: Math.round(q.total * 0.05) },
    ],
  });
  console.log(`  ✓ ${q.service} — $${q.total.toLocaleString()} (${q.status})`);
}

// ── INBOX MESSAGES ────────────────────────────────────────────────────────────
const msgData = [
  { idx: 1, channel: 'email', subject: 'Re: Kitchen Renovation Quote', body: "Hi, thanks for the quick quote. Just had a look and it all looks great. Can we book in for next Thursday for the site visit? Also, do you offer a warranty on your work?\n\nCheers, Sarah", hoursAgo: 1 },
  { idx: 2, channel: 'sms', subject: null, body: "Hey, just following up on the quote. We're keen to go ahead — can we lock in a start date? Happy to pay the deposit this week.", hoursAgo: 3 },
  { idx: 3, channel: 'email', subject: 'Bathroom renovation enquiry', body: "Hi there, I came across your website and I'm interested in a quote for a full bathroom renovation. 4-bed home in Chatswood. Would love to chat when you're free.", hoursAgo: 6 },
  { idx: 4, channel: 'sms', subject: null, body: "Quick question about materials — do you use Dulux? My wife is set on Dulux Wash & Wear. Also are you fully insured for strata work?", hoursAgo: 10 },
  { idx: 9, channel: 'email', subject: 'Urgent — pool fencing compliance', body: "Hi, we've just been notified by council that our pool fence doesn't meet current standards. We have 30 days to fix it or face fines. Can you fit us in urgently?", hoursAgo: 2 },
  { idx: 7, channel: 'sms', subject: null, body: "Sounds good, see you Thursday at 10. I'll have the rooms cleared by then.", hoursAgo: 18 },
  { idx: 5, channel: 'email', subject: 'Great work on the roof!', body: "Just wanted to say the work looks absolutely incredible. Your team was professional, clean and finished ahead of schedule. Will definitely be recommending you to the neighbours. Left a 5-star Google review!", hoursAgo: 48 },
  { idx: 10, channel: 'email', subject: 'New enquiry from website', body: "Hi, I came across your website and I'm interested in getting a quote for a full house repaint. 4-bedroom double storey in Willoughby. Happy to send photos if that helps.", hoursAgo: 72 },
];

console.log('\nInserting inbox messages...');
for (const m of msgData) {
  const lead = insertedLeads[m.idx];
  if (!lead) continue;
  await post('inbox_messages', {
    organization_id: ORG_ID, lead_id: lead.id, channel: m.channel,
    direction: 'inbound', subject: m.subject, body: m.body,
    sender_name: `${lead.first_name} ${lead.last_name}`,
    sender_contact: m.channel === 'sms' ? lead.phone : lead.email,
    is_read: m.hoursAgo > 24,
    created_at: new Date(Date.now() - m.hoursAgo * 3600000).toISOString(),
  });
  console.log(`  ✓ ${lead.first_name} ${lead.last_name} (${m.channel})`);
}

console.log('\n✅ ALL DEMO DATA SEEDED');
console.log(`   Leads: ${insertedLeads.length}`);
console.log(`   Appointments: ${apptData.length}`);
console.log(`   Quotes: ${quoteData.length}`);
console.log(`   Inbox messages: ${msgData.length}`);
