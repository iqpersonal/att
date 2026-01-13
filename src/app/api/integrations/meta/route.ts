import { NextRequest, NextResponse } from 'next/server';
import { validateWhatsAppToken, getWhatsAppConfig } from '@/lib/tokenService';

/**
 * GET: Check token status and expiration
 * POST: Manual token refresh (for admin/settings)
 */
export async function GET(req: NextRequest) {
  try {
    const tenantId = req.nextUrl.searchParams.get('tenantId') || 'tellus-teams';

    const validation = await validateWhatsAppToken(tenantId);
    const config = await getWhatsAppConfig(tenantId);

    return NextResponse.json({
      isConfigured: !!config.accessToken || !!config.systemUserToken,
      expiresAt: config.expiresAt || 0,
      expiry: {
        daysRemaining: Math.floor(validation.hoursUntilExpiry / 24),
        formatted: validation.hoursUntilExpiry > 0 
          ? `${Math.floor(validation.hoursUntilExpiry / 24)}d ${Math.floor(validation.hoursUntilExpiry % 24)}h`
          : 'Expired',
        isExpired: !validation.valid,
      },
      validation,
      hasSystemToken: !!config.systemUserToken,
      lastRefreshed: config.updatedAt || 0,
      tokenVersion: config.systemUserToken ? 2 : 1,
      hasHistory: true,
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
      message: 'Token refresh required. Please reconnect your WhatsApp account.',
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
