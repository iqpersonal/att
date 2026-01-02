
const fs = require('fs');
const fetch = require('node-fetch');

async function run() {
    const content = fs.readFileSync('.env.local', 'utf8');
    const lines = content.split('\n');
    const getVal = (key) => lines.find(l => l.startsWith(key))?.split('=')[1]?.trim();

    const clientId = getVal('AZURE_AD_CLIENT_ID');
    const tenantId = getVal('AZURE_AD_TENANT_ID');
    const clientSecret = getVal('AZURE_AD_CLIENT_SECRET');

    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials',
            scope: 'https://graph.microsoft.com/.default'
        })
    });
    const tokens = await tokenRes.json();
    const token = tokens.access_token;

    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log("Token ROLES (Application Permissions):", payload.roles);
}

run();
