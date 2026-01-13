import { getAdminDb } from './firebaseAdmin';

export interface WhatsAppConfig {
  // User-scoped token (expires in 60 days)
  accessToken: string;
  expiresAt: number;
  
  // System User Token (never expires - use this for API calls)
  systemUserToken?: string;
  
  // Status and metadata
  status: 'connected' | 'token_expired' | 'not_connected';
  connectedAt?: number;
  updatedAt?: number;
  
  // Firestore config
  phoneNumberId?: string;
  wabaId?: string;
  businessAccountId?: string;
}

export interface MicrosoftTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  updatedAt?: string;
}

// ============================================
// WhatsApp Token Functions
// ============================================

/**
 * Get the most reliable token for API calls
 * Priority: System User Token > User Token (if not expired)
 */
export async function getValidWhatsAppToken(tenantId: string): Promise<string> {
  const db = getAdminDb();
  const metaConfigRef = db.doc(`tenants/${tenantId}/integrations/meta`);
  const metaConfigSnap = await metaConfigRef.get();

  if (!metaConfigSnap.exists) {
    throw new Error('WhatsApp not configured. Please connect your account.');
  }

  const config = metaConfigSnap.data() as WhatsAppConfig;

  // Priority 1: Use System User Token (never expires)
  if (config.systemUserToken) {
    console.log('[TokenService] Using System User Token (never expires)');
    return config.systemUserToken;
  }

  // Priority 2: Use user token if valid
  if (config.accessToken) {
    const now = Math.floor(Date.now() / 1000);
    const hoursUntilExpiry = (config.expiresAt - now) / 3600;

    // If token expires within 24 hours, mark for renewal
    if (config.expiresAt && config.expiresAt - now < 86400) {
      console.warn(`[TokenService] Token expiring in ${hoursUntilExpiry.toFixed(1)} hours`);
      
      // Update status to warn UI
      if (hoursUntilExpiry <= 0) {
        await metaConfigRef.update({
          status: 'token_expired',
          updatedAt: now,
        });
        throw new Error('WhatsApp token has expired. Please reconnect in Settings.');
      }
      
      if (hoursUntilExpiry < 24) {
        await metaConfigRef.update({
          status: 'token_expiring',
          updatedAt: now,
        });
      }
    }

    return config.accessToken;
  }

  throw new Error('No valid WhatsApp token found');
}

/**
 * Validate token and check expiration
 */
export async function validateWhatsAppToken(tenantId: string): Promise<{
  valid: boolean;
  expiresIn: number;
  hoursUntilExpiry: number;
  needsRefresh: boolean;
}> {
  const db = getAdminDb();
  const metaConfigRef = db.doc(`tenants/${tenantId}/integrations/meta`);
  const metaConfigSnap = await metaConfigRef.get();

  if (!metaConfigSnap.exists) {
    return { valid: false, expiresIn: 0, hoursUntilExpiry: 0, needsRefresh: false };
  }

  const config = metaConfigSnap.data() as WhatsAppConfig;
  const now = Math.floor(Date.now() / 1000);

  // System token is always valid
  if (config.systemUserToken) {
    return { valid: true, expiresIn: 0, hoursUntilExpiry: 999999, needsRefresh: false };
  }

  if (!config.accessToken) {
    return { valid: false, expiresIn: 0, hoursUntilExpiry: 0, needsRefresh: false };
  }

  const expiresIn = config.expiresAt - now;
  const hoursUntilExpiry = expiresIn / 3600;
  const needsRefresh = hoursUntilExpiry < 24;
  const valid = expiresIn > 0;

  return { valid, expiresIn, hoursUntilExpiry, needsRefresh };
}

/**
 * Update WhatsApp configuration with new tokens
 */
export async function updateWhatsAppTokens(
  tenantId: string,
  tokens: {
    accessToken?: string;
    expiresAt?: number;
    systemUserToken?: string;
  }
): Promise<void> {
  const db = getAdminDb();
  const metaConfigRef = db.doc(`tenants/${tenantId}/integrations/meta`);
  const now = Math.floor(Date.now() / 1000);

  const updateData: any = {
    updatedAt: now,
    status: 'connected',
  };

  if (tokens.accessToken) {
    updateData.accessToken = tokens.accessToken;
  }

  if (tokens.expiresAt) {
    updateData.expiresAt = tokens.expiresAt;
  }

  if (tokens.systemUserToken) {
    updateData.systemUserToken = tokens.systemUserToken;
  }

  await metaConfigRef.update(updateData);
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

// ============================================
// Microsoft Token Functions
// ============================================

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
