
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

    const now = new Date();
    console.log(`Current Server Time: ${now.toISOString()}`);

    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${coordinatorEmail}/calendar/calendarView?startDateTime=${new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()}&endDateTime=${new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (data.value) {
        console.log(`Found ${data.value.length} events in calendarView.`);
        data.value.forEach(m => {
            const start = new Date(m.start.dateTime);
            const end = new Date(m.end.dateTime);
            const isLive = now >= start && now <= end;
            console.log(`- Subject: ${m.subject}`);
            console.log(`  Start: ${m.start.dateTime} (${m.start.timeZone})`);
            console.log(`  End:   ${m.end.dateTime} (${m.end.timeZone})`);
            console.log(`  Is Live (Dashboard Logic): ${isLive}`);
            if (isLive) console.log("  !!! SHOULD BE IN LIVE TAB !!!");
        });
    } else {
        console.log("No events found.");
    }
}

run();
