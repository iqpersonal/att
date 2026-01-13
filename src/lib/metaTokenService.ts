import fetch from 'node-fetch';

// Meta token refresh interface
interface MetaTokenRefreshResult {
  accessToken: string;
  expiresAt: number; // Unix timestamp
  refreshedAt: number;
  success: boolean;
  error?: string;
}

interface TokenVersion {
  token: string;
  expiresAt: number;
  createdAt: number;
  isActive: boolean;
}

/**
 * Refresh Meta access token using System User token
 * Meta tokens expire in ~60 days, this function extends them via the token endpoint
 */
export async function refreshMetaToken(
  currentToken: string,
  systemUserToken: string
): Promise<MetaTokenRefreshResult> {
  try {
    // Meta provides token extension via /me/token endpoint
    const url = 'https://graph.facebook.com/v21.0/oauth/access_token_debug';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Meta Token Refresh Service'
      }
    }) as any;

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error?.message || 'Failed to validate token');
    }

    // Token is valid, now extend it
    const extendUrl = 'https://graph.facebook.com/v21.0/oauth/access_token';
    const extendResponse = await fetch(extendUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Meta Token Refresh Service'
      }
    }) as any;

    const extendData = await extendResponse.json();

    if (!extendResponse.ok || extendData.error) {
      throw new Error(extendData.error?.message || 'Failed to refresh token');
    }

    const expiresIn = extendData.expires_in || 5184000; // 60 days default
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    return {
      accessToken: extendData.access_token || currentToken,
      expiresAt,
      refreshedAt: Math.floor(Date.now() / 1000),
      success: true
    };
  } catch (error) {
    return {
      accessToken: currentToken,
      expiresAt: 0,
      refreshedAt: Math.floor(Date.now() / 1000),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if token needs refresh (expires within 7 days)
 */
export function shouldRefreshToken(expiresAt: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  const sevenDaysInSeconds = 7 * 24 * 60 * 60;
  return expiresAt - now <= sevenDaysInSeconds;
}

/**
 * Format token expiry as human-readable
 */
export function formatTokenExpiry(expiresAt: number): {
  daysRemaining: number;
  formatted: string;
  isExpired: boolean;
} {
  const now = Math.floor(Date.now() / 1000);
  const secondsRemaining = expiresAt - now;
  const daysRemaining = Math.floor(secondsRemaining / (24 * 60 * 60));

  return {
    daysRemaining,
    formatted: daysRemaining > 0 ? \\ days\ : 'Expired',
    isExpired: secondsRemaining <= 0
  };
}
