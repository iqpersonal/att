
const fs = require('fs');
const fetch = require('node-fetch');

async function run() {
    const content = fs.readFileSync('.env.local', 'utf8');
    const lines = content.split('\n');
    const getVal = (key) => lines.find(l => l.startsWith(key))?.split('=')[1]?.trim();

    const clientId = getVal('AZURE_AD_CLIENT_ID');
    const tenantId = getVal('AZURE_AD_TENANT_ID');
    const clientSecret = getVal('AZURE_AD_CLIENT_SECRET');
    const organizerOid = "0467d443-90f8-4186-957b-7b22e70a7352";

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

    console.log(`Checking OnlineMeetings for OID ${organizerOid}...`);
    // Try to get meeting by JoinURL using the OID directly
    const joinUrl = 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_MmI1YjQxYTAtODVlYi00ZDNjLWFjOTYtM2MzZTNlNDkyNTZl%40thread.v2/0?context=%7b%22Tid%22%3a%2237c466d1-7ea8-4918-85d6-8b5195e097f2%22%2c%22Oid%22%3a%220467d443-90f8-4186-957b-7b22e70a7352%22%7d';

    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${organizerOid}/onlineMeetings?$filter=joinWebUrl eq '${joinUrl.replace(/'/g, "''")}'`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log("Result for OID search:", JSON.stringify(data, null, 2));
}

run();
