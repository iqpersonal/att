import { getAdminDb } from './firebaseAdmin';

export interface WhatsAppConfig {
  accessToken: string;
  expiresAt: number;
  status: 'connected' | 'token_expired' | 'not_connected';
  connectedAt?: number;
  phoneNumberId?: string;
  wabaId?: string;
}

export interface MicrosoftTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  updatedAt?: string;
}

// WhatsApp Token Functions
export async function refreshWhatsAppToken(tenantId: string): Promise<string> {
  const db = getAdminDb();
  const metaConfigRef = db.doc(`tenants/${tenantId}/integrations/meta`);
  const metaConfigSnap = await metaConfigRef.get();

  if (!metaConfigSnap.exists) {
    throw new Error('WhatsApp not configured. Please connect your account.');
  }

  const data = metaConfigSnap.data() as WhatsAppConfig;
  
  if (!data.accessToken) {
    throw new Error('No access token found');
  }

  const now = Math.floor(Date.now() / 1000);

  // Check if token is expired or expiring soon (within 1 hour)
  if (data.expiresAt && data.expiresAt - now < 3600) {
    console.warn('[TokenService] Token expired or expiring soon');
    
    // Mark as expired so UI can prompt reconnection
    await metaConfigRef.update({
      status: 'token_expired',
      updatedAt: now,
    });
    
    throw new Error('WhatsApp token expired. Please reconnect in Settings.');
  }

  return data.accessToken;
}

export async function getValidWhatsAppToken(tenantId: string): Promise<string> {
  try {
    return await refreshWhatsAppToken(tenantId);
  } catch (error: any) {
    console.error('[TokenService] Failed to get valid token:', error.message);
    throw error;
  }
}

export async function getWhatsAppConfig(tenantId: string): Promise<WhatsAppConfig> {
  const db = getAdminDb();
  const metaConfigRef = db.doc(`tenants/${tenantId}/integrations/meta`);
  const metaConfigSnap = await metaConfigRef.get();

  if (!metaConfigSnap.exists) {
    throw new Error('WhatsApp not configured');
  }

  return metaConfigSnap.data() as WhatsAppConfig;
}

// Microsoft Token Functions
export async function refreshMicrosoftToken(refreshToken: string): Promise<MicrosoftTokens> {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const tenantId = process.env.AZURE_AD_TENANT_ID;

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('Microsoft OAuth credentials not configured');
  }

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'Calendars.Read User.Read',
    }).toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Microsoft token');
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
  };
}

export async function saveMicrosoftTokens(
  userId: string,
  tokens: MicrosoftTokens
): Promise<void> {
  const db = getAdminDb();
  const userRef = db.collection('users').doc(userId);
  
  await userRef.update({
    microsoftTokens: {
      ...tokens,
      updatedAt: new Date().toISOString(),
    }
  }, { merge: true });
}
