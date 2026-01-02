
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

    console.log("Listing all online meetings for coordinator...");
    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${coordinatorEmail}/onlineMeetings`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (data.value) {
        console.log(`Found ${data.value.length} meetings.`);
        data.value.forEach(m => {
            console.log(`- Subject: ${m.subject}`);
            console.log(`  ID: ${m.id}`);
            console.log(`  JoinURL (start): ${m.joinWebUrl?.substring(0, 100)}...`);
        });
    } else {
        console.log("No online meetings found. Error:", JSON.stringify(data, null, 2));
    }
}

run();
