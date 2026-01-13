// OAuth constants and helper functions
export const WHATSAPP_API_VERSION = 'v21.0';

export function generateOAuthAuthorizeURL(tenantId: string, redirectUri: string): string {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const scope = 'whatsapp_business_messaging,whatsapp_business_management';
  const state = Buffer.from(JSON.stringify({ tenantId })).toString('base64');
  
  return https://www.facebook.com//dialog/oauth?client_id=&redirect_uri=&scope=&state=;
}

export function decodeState(state: string): { tenantId: string } {
  const decoded = Buffer.from(state, 'base64').toString('utf-8');
  return JSON.parse(decoded);
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<any> {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  
  const response = await fetch(https://graph.facebook.com//oauth/access_token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error(Failed to exchange code: );
  }

  return response.json();
}
