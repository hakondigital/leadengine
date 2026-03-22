import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/auth/google/callback — handles OAuth callback from Google
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // organization_id
    const error = searchParams.get('error');

    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?gmail=error&reason=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?gmail=error&reason=missing_params`
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?gmail=error&reason=not_configured`
      );
    }

    const redirectUri = `${appUrl}/api/auth/google/callback`;

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const tokenError = await tokenRes.text();
      console.error('Google token exchange failed:', tokenError);
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?gmail=error&reason=token_exchange_failed`
      );
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokens;

    if (!access_token) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?gmail=error&reason=no_access_token`
      );
    }

    // Get user email from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    let gmailEmail = '';
    if (userRes.ok) {
      const userInfo = await userRes.json();
      gmailEmail = userInfo.email || '';
    }

    // Store tokens in organization settings
    const supabase = await createServiceRoleClient();

    let { data: org } = await supabase
      .from('organizations')
      .select('id, settings')
      .eq('id', state)
      .single();

    if (!org) {
      const { data: orgBySlug } = await supabase
        .from('organizations')
        .select('id, settings')
        .eq('slug', state)
        .single();
      org = orgBySlug;
    }

    if (!org) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?gmail=error&reason=org_not_found`
      );
    }

    // Save tokens — use fallback approach for reliability
    const newSettings = {
      gmail_access_token: access_token,
      gmail_refresh_token: refresh_token || null,
      gmail_token_expires_at: Date.now() + (expires_in || 3600) * 1000,
      gmail_email: gmailEmail,
      gmail_connected_at: new Date().toISOString(),
    };

    const existingSettings = (org.settings as Record<string, unknown>) || {};
    const merged = { ...existingSettings, ...newSettings };

    const { error: updateError } = await supabase
      .from('organizations')
      .update({ settings: merged })
      .eq('id', org.id);

    if (updateError) {
      console.error('Failed to save Gmail tokens:', updateError);
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?gmail=error&reason=save_failed`
      );
    }

    // Verify
    const { data: verifyOrg } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', org.id)
      .single();

    if (!(verifyOrg?.settings as Record<string, unknown>)?.gmail_access_token) {
      console.error('Gmail tokens verification failed');
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?gmail=error&reason=verification_failed`
      );
    }

    // Trigger immediate email sync (fire and forget)
    import('@/app/api/gmail/sync/route').then(({ syncGmailForOrg }) => {
      syncGmailForOrg(org!.id).catch(console.error);
    }).catch(console.error);

    return NextResponse.redirect(`${appUrl}/dashboard/settings?gmail=connected`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?gmail=error&reason=unknown`
    );
  }
}
