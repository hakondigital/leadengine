import { NextResponse, type NextRequest } from 'next/server';

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA'; // test key

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ success: false, error: 'No token provided' }, { status: 400 });
    }

    const formData = new URLSearchParams();
    formData.append('secret', TURNSTILE_SECRET);
    formData.append('response', token);

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
    if (ip) formData.append('remoteip', ip);

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const outcome = await result.json();

    return NextResponse.json({
      success: outcome.success === true,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 });
  }
}
