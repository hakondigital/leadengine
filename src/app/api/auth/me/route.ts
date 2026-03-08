import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/super-admin';

export async function GET(request: NextRequest) {
  try {
    let user = null;
    let authMethod = '';

    // Method 1: Try cookie-based auth first
    try {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        user = data.user;
        authMethod = 'cookie';
      }
    } catch {
      // Cookie auth failed, try token
    }

    // Method 2: Fall back to Authorization header (Bearer token)
    if (!user) {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      if (token) {
        const supabase = await createServiceRoleClient();
        const { data } = await supabase.auth.getUser(token);
        if (data.user) {
          user = data.user;
          authMethod = 'token';
        }
      }
    }

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        error: 'Not authenticated. Pass Authorization: Bearer <token> header.',
      }, { status: 401 });
    }

    const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || '').replace(/['"]/g, '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

    return NextResponse.json({
      authenticated: true,
      email: user.email,
      id: user.id,
      isSuperAdmin: isSuperAdminEmail(user.email),
      authMethod,
      _debug: {
        configuredEmails: superAdminEmails,
        userEmailNormalized: user.email?.trim().toLowerCase(),
        match: superAdminEmails.includes(user.email?.trim().toLowerCase() || ''),
      },
    });
  } catch (err) {
    return NextResponse.json({
      authenticated: false,
      error: 'Auth check failed',
      detail: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 });
  }
}
