import { getAdminDb } from './firebaseAdmin';

export interface WhatsAppConfig {
  accessToken: string;
  expiresAt: number;
  status: 'connected' | 'token_expired' | 'not_connected';
  connectedAt?: number;
  phoneNumberId?: string;
  wabaId?: string;
}

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
