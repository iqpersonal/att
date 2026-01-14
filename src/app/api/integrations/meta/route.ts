import { NextRequest, NextResponse } from 'next/server';
import { validateWhatsAppToken, getWhatsAppConfig } from '@/lib/tokenService';
import { getBestWhatsAppToken } from '@/lib/envTokenManager';

/**
 * GET: Check token status and expiration
 * POST: Manual token refresh (for admin/settings)
 */
export async function GET(req: NextRequest) {
  try {
    const tenantId = req.nextUrl.searchParams.get('tenantId') || 'tellus-teams';

    // Check environment token first (System User Token is most reliable)
    let envTokenInfo = { hasToken: false, isSystemToken: false };
    try {
      const { token, source } = getBestWhatsAppToken();
      envTokenInfo = {
        hasToken: !!token,
        isSystemToken: source === 'SYSTEM_USER_TOKEN'
      };
      console.log(`[Meta Status] Using environment token: ${source}`);
    } catch (e) {
      console.log('[Meta Status] No environment token configured');
    }

    const validation = await validateWhatsAppToken(tenantId);
    const config = await getWhatsAppConfig(tenantId);

    return NextResponse.json({
      isConfigured: envTokenInfo.hasToken || !!config.accessToken || !!config.systemUserToken,
      expiresAt: config.expiresAt || 0,
      expiry: {
        daysRemaining: Math.floor(validation.hoursUntilExpiry / 24),
        formatted: validation.hoursUntilExpiry > 0 
          ? `${Math.floor(validation.hoursUntilExpiry / 24)}d ${Math.floor(validation.hoursUntilExpiry % 24)}h`
          : 'Expired',
        isExpired: !validation.valid,
      },
      validation,
      hasSystemToken: envTokenInfo.isSystemToken || !!config.systemUserToken,
      lastRefreshed: config.updatedAt || 0,
      tokenVersion: envTokenInfo.isSystemToken ? 'SYSTEM_USER_TOKEN' : (config.systemUserToken ? 2 : 1),
      hasHistory: true,
      environmentTokenInfo: envTokenInfo,
    });
  } catch (error: any) {
    console.error('[Meta Token Status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch token status' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId = 'tellus-teams' } = await req.json();

    // Check if we have a system token in environment (never expires)
    try {
      const { token, source } = getBestWhatsAppToken();
      if (source === 'SYSTEM_USER_TOKEN') {
        return NextResponse.json({
          success: true,
          message: 'System User Token is active and does not expire',
          tokenType: 'SYSTEM_USER_TOKEN',
          validation: { valid: true, needsRefresh: false },
        });
      }
    } catch (e) {
      // Fall through to validation check
    }

    const validation = await validateWhatsAppToken(tenantId);

    if (!validation.needsRefresh) {
      return NextResponse.json({
        success: true,
        message: 'Token is still valid',
        validation,
      });
    }

    // Token needs refresh - UI should prompt user to reconnect
    // (WhatsApp tokens cannot be refreshed via API, only extended)
    return NextResponse.json({
      success: false,
      message: 'Token refresh required. Please reconnect your WhatsApp account or add META_SYSTEM_USER_TOKEN to environment.',
      validation,
      action: 'RECONNECT_REQUIRED',
    }, { status: 401 });
  } catch (error: any) {
    console.error('[Meta Token Refresh] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to refresh token' },
      { status: 500 }
    );
  }
}

// Force rebuild - 2026-01-14 20:01:14
