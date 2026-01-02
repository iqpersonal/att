
const fs = require('fs');
const fetch = require('node-fetch');

async function run() {
    const content = fs.readFileSync('.env.local', 'utf8');
    const lines = content.split('\n');
    const getVal = (key) => lines.find(l => l.startsWith(key))?.split('=')[1]?.trim();

    const clientId = getVal('AZURE_AD_CLIENT_ID');
    const tenantId = getVal('AZURE_AD_TENANT_ID');
    const clientSecret = getVal('AZURE_AD_CLIENT_SECRET');
    const coordinatorEmail = "admin@tellusonlinela.onmicrosoft.com";

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

    console.log(`Checking details for ${coordinatorEmail}...`);
    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${coordinatorEmail}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const user = await res.json();
    console.log("User details:", JSON.stringify(user, null, 2));

    const targetOid = "0467d443-90f8-4186-957b-7b22e70a7352";
    if (user.id === targetOid) {
        console.log("MATCH: Coordinator matches Meeting Organizer Oid.");
    } else {
        console.log(`MISMATCH: Coordinator Oid is ${user.id}, but JoinURL Oid is ${targetOid}`);
        console.log("Searching for user with Oid...");
        const res2 = await fetch(`https://graph.microsoft.com/v1.0/users/${targetOid}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const user2 = await res2.json();
        console.log("Actual Organizer Details:", JSON.stringify(user2, null, 2));
    }
}

run();
