import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, decodeState } from '@/lib/whatsappOAuth';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  
  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Decode state to get tenantId
    const { tenantId } = decodeState(state);
    
    // Exchange code for token
    const redirectUri = `${appUrl}/api/integrations/whatsapp/oauth/callback`;
    const tokenData = await exchangeCodeForToken(code, redirectUri);

    // Save to Firestore
    const db = getAdminDb();
    const metaConfigRef = db.doc(`tenants/${tenantId}/integrations/meta`);
    
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + (tokenData.expires_in || 5184000); // Default 60 days

    await metaConfigRef.set({
      accessToken: tokenData.access_token,
      expiresAt,
      connectedAt: now,
      updatedAt: now,
      status: 'connected',
      source: 'oauth',
    }, { merge: true });

    console.log('[OAuth Callback] Token saved for tenant:', tenantId);

    // Redirect to settings page with success
    return NextResponse.redirect(
      new URL(`/dashboard/settings/integrations?status=success&type=whatsapp`, appUrl)
    );
  } catch (error) {
    console.error('[OAuth Callback] Error:', error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      new URL(`/dashboard/settings/integrations?status=error&type=whatsapp`, appUrl)
    );
  }
}
