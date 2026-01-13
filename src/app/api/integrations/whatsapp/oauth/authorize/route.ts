import { NextRequest, NextResponse } from 'next/server';
import { generateOAuthAuthorizeURL } from '@/lib/whatsappOAuth';

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenantId');
  
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = ${appUrl}/api/integrations/whatsapp/oauth/callback;
  const authUrl = generateOAuthAuthorizeURL(tenantId, redirectUri);

  return NextResponse.redirect(authUrl);
}
