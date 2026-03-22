import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// GET /api/auth/outlook/callback — handles OAuth callback from Microsoft
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // organization_id
    const error = searchParams.get('error');

    if (error) {
      console.error('Microsoft OAuth error:', error);
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?outlook=error&reason=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?outlook=error&reason=missing_params`
      );
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?outlook=error&reason=not_configured`
      );
    }

    const redirectUri = `${appUrl}/api/auth/outlook/callback`;

    // Exchange authorization code for tokens (Microsoft requires form-urlencoded)
    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: 'openid email Mail.Read User.Read offline_access',
    });

    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });

    if (!tokenRes.ok) {
      const tokenError = await tokenRes.text();
      console.error('Microsoft token exchange failed:', tokenError);
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?outlook=error&reason=token_exchange_failed`
      );
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokens;

    if (!access_token) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?outlook=error&reason=no_access_token`
      );
    }

    // Get user email from Microsoft Graph
    const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    let outlookEmail = '';
    if (userRes.ok) {
      const userInfo = await userRes.json();
      outlookEmail = userInfo.mail || userInfo.userPrincipalName || '';
    }

    // Store tokens in organization settings
    const supabase = await createServiceRoleClient();

    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', state)
      .single();

    if (!org) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?outlook=error&reason=org_not_found`
      );
    }

    const existingSettings = (org.settings as Record<string, unknown>) || {};

    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        settings: {
          ...existingSettings,
          outlook_access_token: access_token,
          outlook_refresh_token: refresh_token || existingSettings.outlook_refresh_token || null,
          outlook_token_expires_at: Date.now() + (expires_in || 3600) * 1000,
          outlook_email: outlookEmail,
          outlook_connected_at: new Date().toISOString(),
        },
      })
      .eq('id', state);

    if (updateError) {
      console.error('Failed to save Outlook tokens:', updateError);
      return NextResponse.redirect(
        `${appUrl}/dashboard/settings?outlook=error&reason=save_failed`
      );
    }

    return NextResponse.redirect(`${appUrl}/dashboard/settings?outlook=connected`);
  } catch (error) {
    console.error('Microsoft OAuth callback error:', error);
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?outlook=error&reason=unknown`
    );
  }
}
