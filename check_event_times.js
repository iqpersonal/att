
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

    const eventId = 'AAMkADAxYTQzOTE2LTliMGUtNGZjOC05OTZhLTI3NDY0MmQ0MDA1MABGAAAAAACPAp509zk2SrkZKVu959YIBwBdAdkKzvaPQJDctxn6mB4wAAAT7QuLAABdAdkKzvaPQJDctxn6mB4wAACTOBJ5AAA=';

    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${coordinatorEmail}/calendar/events/${encodeURIComponent(eventId)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const event = await res.json();
    console.log("Specific Event Times:");
    console.log(`- Subject: ${event.subject}`);
    console.log(`- Start: ${event.start?.dateTime} (${event.start?.timeZone})`);
    console.log(`- End:   ${event.end?.dateTime} (${event.end?.timeZone})`);
}

run();
