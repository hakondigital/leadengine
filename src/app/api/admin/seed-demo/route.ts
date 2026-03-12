import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkSuperAdmin } from '@/lib/super-admin';

// POST /api/admin/seed-demo
// Seeds the authenticated super admin's org with realistic demo data.
// Super admin only.

export async function POST(request: NextRequest) {
  const { isSuperAdmin, userId } = await checkSuperAdmin(request);
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
  }

  const supabase = await createServiceRoleClient();

  // Find the org for this super admin
  const { data: userProfile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('auth_id', userId)
    .single();

  if (!userProfile?.organization_id) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const orgId = userProfile.organization_id;

  // ── LEADS ───────────────────────────────────────────────────────────────────
  const leads = [
    { first_name: 'James', last_name: 'Mitchell', email: 'james.mitchell@email.com', phone: '0412 345 678', service_type: 'Full House Repaint', status: 'won', score: 92, notes: 'Repeat customer, referred 2 others', source: 'Google Ads', suburb: 'Mosman', budget: '$4,500–$6,000' },
    { first_name: 'Sarah', last_name: 'Chen', email: 'sarah.chen@gmail.com', phone: '0423 456 789', service_type: 'Kitchen Renovation', status: 'proposal', score: 85, notes: 'Ready to proceed, waiting on quote', source: 'Facebook', suburb: 'Neutral Bay', budget: '$12,000–$18,000' },
    { first_name: 'Marcus', last_name: 'Thompson', email: 'm.thompson@hotmail.com', phone: '0434 567 890', service_type: 'Deck Installation', status: 'qualified', score: 78, notes: 'Timeline flexible, prefers weekends', source: 'Website', suburb: 'Manly', budget: '$8,000–$11,000' },
    { first_name: 'Priya', last_name: 'Sharma', email: 'priya.sharma@work.com', phone: '0445 678 901', service_type: 'Bathroom Renovation', status: 'new', score: 71, notes: 'First enquiry, needs callback', source: 'Instagram', suburb: 'Chatswood', budget: '$15,000–$22,000' },
    { first_name: 'Tom', last_name: 'Reynolds', email: 'treynolds@gmail.com', phone: '0456 789 012', service_type: 'Fence & Gate', status: 'contacted', score: 63, notes: 'Comparing 3 quotes', source: 'Referral', suburb: 'Cremorne', budget: '$3,200–$4,500' },
    { first_name: 'Emma', last_name: 'Wilson', email: 'emma.w@icloud.com', phone: '0467 890 123', service_type: 'Roof Restoration', status: 'won', score: 88, notes: 'Insurance job, smooth process', source: 'Google Ads', suburb: 'North Sydney', budget: '$9,500–$13,000' },
    { first_name: 'David', last_name: 'Park', email: 'dpark@outlook.com', phone: '0478 901 234', service_type: 'Landscaping', status: 'lost', score: 44, notes: 'Went with competitor on price', source: 'Facebook', suburb: 'Lane Cove', budget: '$6,000–$8,000' },
    { first_name: 'Lucy', last_name: 'Hart', email: 'lucy.hart@email.com', phone: '0489 012 345', service_type: 'Interior Painting', status: 'qualified', score: 80, notes: 'Moving in 6 weeks, urgent timeline', source: 'Website', suburb: 'Crows Nest', budget: '$2,800–$4,200' },
    { first_name: 'Ahmed', last_name: 'Al-Farsi', email: 'ahmed.alfarsi@gmail.com', phone: '0490 123 456', service_type: 'Driveway Paving', status: 'proposal', score: 76, notes: 'Wants stamped concrete options', source: 'Google Ads', suburb: 'St Leonards', budget: '$7,500–$10,000' },
    { first_name: 'Claire', last_name: 'Morrison', email: 'cmorrison@work.com.au', phone: '0401 234 567', service_type: 'Pool Fencing', status: 'new', score: 68, notes: 'Council compliance deadline end of month', source: 'Referral', suburb: 'Kirribilli', budget: '$4,000–$6,500' },
    { first_name: 'Ben', last_name: 'Crawford', email: 'ben.c@icloud.com', phone: '0412 987 654', service_type: 'Full House Repaint', status: 'contacted', score: 59, notes: 'Has photos ready to send', source: 'Instagram', suburb: 'Willoughby', budget: '$5,000–$7,500' },
    { first_name: 'Sophie', last_name: 'Turner', email: 'sophie.turner@gmail.com', phone: '0423 876 543', service_type: 'Kitchen Renovation', status: 'won', score: 95, notes: 'High value job, excellent communication', source: 'Google Ads', suburb: 'Balmoral', budget: '$28,000–$35,000' },
  ];

  const insertedLeads: { id: string; first_name: string; last_name: string; email: string; phone: string }[] = [];
  for (const lead of leads) {
    const daysAgo = Math.floor(Math.random() * 60);
    const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();
    const { data } = await supabase
      .from('leads')
      .insert({
        organization_id: orgId,
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        service_type: lead.service_type,
        status: lead.status,
        score: lead.score,
        notes: lead.notes,
        source: lead.source,
        suburb: lead.suburb,
        budget: lead.budget,
        created_at: createdAt,
      })
      .select('id, first_name, last_name, email, phone')
      .single();
    if (data) insertedLeads.push(data);
  }

  // ── APPOINTMENTS ─────────────────────────────────────────────────────────────
  const appointmentLeads = insertedLeads.filter((_, i) => i < 5);
  for (let i = 0; i < appointmentLeads.length; i++) {
    const lead = appointmentLeads[i];
    const daysFromNow = (i - 2) * 3; // mix of past and future
    const apptDate = new Date(Date.now() + daysFromNow * 86400000);
    apptDate.setHours(9 + i * 1, 0, 0, 0);
    await supabase.from('appointments').insert({
      organization_id: orgId,
      lead_id: lead.id,
      title: `Site Visit — ${lead.first_name} ${lead.last_name}`,
      start_time: apptDate.toISOString(),
      end_time: new Date(apptDate.getTime() + 60 * 60 * 1000).toISOString(),
      status: daysFromNow < 0 ? 'completed' : 'scheduled',
      notes: 'Measure up and discuss scope. Bring sample boards.',
    });
  }

  // ── QUOTES ───────────────────────────────────────────────────────────────────
  const quoteLeads = insertedLeads.filter((_, i) => i < 6);
  const quoteStatuses = ['sent', 'accepted', 'sent', 'accepted', 'draft', 'accepted'];
  for (let i = 0; i < quoteLeads.length; i++) {
    const lead = quoteLeads[i];
    const total = 3000 + Math.floor(Math.random() * 20000);
    await supabase.from('quotes').insert({
      organization_id: orgId,
      lead_id: lead.id,
      title: `Quote — ${leads[i].service_type}`,
      status: quoteStatuses[i],
      total_amount: total,
      valid_until: new Date(Date.now() + 14 * 86400000).toISOString(),
      notes: 'Includes all materials and labour. GST included.',
      line_items: [
        { description: 'Labour', quantity: 1, unit_price: Math.round(total * 0.6), total: Math.round(total * 0.6) },
        { description: 'Materials', quantity: 1, unit_price: Math.round(total * 0.35), total: Math.round(total * 0.35) },
        { description: 'Site cleanup', quantity: 1, unit_price: Math.round(total * 0.05), total: Math.round(total * 0.05) },
      ],
    });
  }

  // ── INBOX MESSAGES ────────────────────────────────────────────────────────────
  const inboxLeads = insertedLeads.slice(0, 8);
  const inboxMessages = [
    { subject: 'Re: Quote for interior painting', body: "Hi, thanks for the quick quote. Just had a look and it all looks great. Can we book in for next Thursday for the site visit? Also, do you offer a warranty on your work?\n\nCheers, Sarah" },
    { subject: 'Enquiry from website', body: "Hi there, I came across your website and I'm interested in getting a quote for a full house repaint. 4-bed double storey in Mosman. Would love to chat when you're free." },
    { subject: 'Following up on quote', body: "Hey, just following up on the quote you sent last week. We're keen to go ahead — can we lock in a start date? Happy to pay the deposit this week." },
    { subject: 'Question about materials', body: "Quick question — do you use Dulux or Taubmans? My wife has her heart set on Dulux Wash & Wear for the living areas. Also are you fully insured? Need to check for our strata." },
    { subject: 'Referral from James Mitchell', body: "Hi, James Mitchell recommended you guys. He said you did an amazing job on his place in Mosman last year. I'm looking for someone to redo my kitchen and bathrooms. Are you available for a quote next week?" },
    { subject: 'Urgent — pool fencing compliance', body: "Hi, we've just been notified by council that our pool fence doesn't meet current standards. We have 30 days to fix it or face fines. Can you fit us in urgently? Happy to pay a premium for fast turnaround." },
    { subject: 'Deck quote follow-up', body: "Just checking in on the deck quote from last week. We've decided we want to go with spotted gum instead of pine — would that change the price much? Also thinking about adding built-in seating." },
    { subject: 'Great work on the bathroom!', body: "Just wanted to say the bathroom looks absolutely incredible. Your team was professional, clean and finished ahead of schedule. Will definitely be using you again for the kitchen next year. Left you a 5-star Google review ⭐" },
  ];

  for (let i = 0; i < inboxLeads.length; i++) {
    const lead = inboxLeads[i];
    const msg = inboxMessages[i];
    const hoursAgo = (i + 1) * 8;
    await supabase.from('inbox_messages').insert({
      organization_id: orgId,
      lead_id: lead.id,
      channel: i % 3 === 0 ? 'sms' : 'email',
      direction: 'inbound',
      subject: msg.subject,
      body: msg.body,
      sender_name: `${lead.first_name} ${lead.last_name}`,
      sender_contact: i % 3 === 0 ? lead.phone : lead.email,
      is_read: i > 3,
      created_at: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
    });
  }

  return NextResponse.json({
    success: true,
    seeded: {
      leads: insertedLeads.length,
      appointments: appointmentLeads.length,
      quotes: quoteLeads.length,
      inbox_messages: inboxLeads.length,
    },
  });
}
