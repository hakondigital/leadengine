import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    resend: !!process.env.RESEND_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    stripe: !!process.env.STRIPE_SECRET_KEY,
    ai_provider: process.env.AI_PROVIDER || 'openai',
  });
}
