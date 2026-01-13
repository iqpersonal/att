/**
 * Environment-based token manager
 * Reads tokens from .env for immediate use without Firestore dependency
 */

export function getSystemUserTokenFromEnv(): string {
  const token = process.env.META_SYSTEM_USER_TOKEN;
  if (!token) {
    throw new Error('META_SYSTEM_USER_TOKEN not found in environment variables');
  }
  return token;
}

export function getPhoneNumberIdFromEnv(): string {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneId) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID not found in environment variables');
  }
  return phoneId;
}

export function getWhatsAppAccessTokenFromEnv(): string {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    throw new Error('WHATSAPP_ACCESS_TOKEN not found in environment variables');
  }
  return token;
}

export function getWabaIdFromEnv(): string {
  const wabaId = process.env.WHATSAPP_WABA_ID;
  if (!wabaId) {
    throw new Error('WHATSAPP_WABA_ID not found in environment variables');
  }
  return wabaId;
}

/**
 * Get the best available token for WhatsApp API calls
 * Priority: System User Token (most reliable) > User Access Token (backup)
 */
export function getBestWhatsAppToken(): { token: string; source: string } {
  try {
    const systemToken = getSystemUserTokenFromEnv();
    console.log('[EnvTokenManager] Using System User Token from .env');
    return { token: systemToken, source: 'SYSTEM_USER_TOKEN' };
  } catch (error) {
    console.warn('[EnvTokenManager] System User Token not available, trying fallback', error);
  }

  try {
    const userToken = getWhatsAppAccessTokenFromEnv();
    console.log('[EnvTokenManager] Using User Access Token from .env (fallback)');
    return { token: userToken, source: 'USER_ACCESS_TOKEN' };
  } catch (error) {
    throw new Error('No WhatsApp token available in environment');
  }
}
