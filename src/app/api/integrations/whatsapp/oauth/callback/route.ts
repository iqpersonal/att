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

    // Build update object with both tokens
    const updateData: any = {
      accessToken: tokenData.access_token,
      expiresAt,
      connectedAt: now,
      updatedAt: now,
      status: 'connected',
      source: 'oauth',
    };

    // If system user token is available (from tokenData), store it
    if (tokenData.system_user_token) {
      updateData.systemUserToken = tokenData.system_user_token;
      console.log('[OAuth Callback] System User Token received and stored');
    }

    // Extract and store additional config
    if (tokenData.phone_number_id) {
      updateData.phoneNumberId = tokenData.phone_number_id;
    }

    if (tokenData.waba_id) {
      updateData.wabaId = tokenData.waba_id;
    }

    if (tokenData.business_account_id) {
      updateData.businessAccountId = tokenData.business_account_id;
    }

    await metaConfigRef.set(updateData, { merge: true });

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
