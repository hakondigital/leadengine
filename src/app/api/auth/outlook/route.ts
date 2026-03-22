import { NextResponse, type NextRequest } from 'next/server';

// GET /api/auth/outlook — initiates Microsoft OAuth flow for Outlook integration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organization_id = searchParams.get('organization_id');

    if (!organization_id) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!clientId || !appUrl) {
      return NextResponse.json(
        { error: 'Microsoft OAuth not configured' },
        { status: 500 }
      );
    }

    const redirectUri = `${appUrl}/api/auth/outlook/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email Mail.Read User.Read offline_access',
      prompt: 'consent',
      state: organization_id,
    });

    const microsoftAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

    return NextResponse.redirect(microsoftAuthUrl);
  } catch (error) {
    console.error('Microsoft OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Microsoft OAuth' },
      { status: 500 }
    );
  }
}
