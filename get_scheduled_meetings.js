
const fs = require('fs');

async function run() {
    const content = fs.readFileSync('.env.local', 'utf8');
    const getVal = (key) => content.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.trim();

    const clientId = getVal('AZURE_AD_CLIENT_ID');
    const tenantId = getVal('AZURE_AD_TENANT_ID');
    const clientSecret = getVal('AZURE_AD_CLIENT_SECRET');
    const targetUser = "admin@tellusonlinela.onmicrosoft.com";

    if (!clientId || !tenantId || !clientSecret) {
        console.error("Missing credentials in .env.local");
        return;
    }

    console.log(`\n--- Fetching Meetings for ${targetUser} ---`);
    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("grant_type", "client_credentials");
    params.append("scope", "https://graph.microsoft.com/.default");

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });
    const data = await res.json();
    const token = data.access_token;

    const now = new Date();
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Using calendarView for scheduled events
    const meetRes = await fetch(`https://graph.microsoft.com/v1.0/users/${targetUser}/calendarView?startDateTime=${start}&endDateTime=${end}&$select=id,subject,start,end,onlineMeeting,isOnlineMeeting`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const meetData = await meetRes.json();

    if (meetData.error) {
        console.error("Graph Error:", meetData.error.message);
        return;
    }

    if (meetData.value && meetData.value.length > 0) {
        console.log("Scheduled Meetings:");
        meetData.value.forEach(m => {
            const isTeams = m.isOnlineMeeting || m.onlineMeeting;
            console.log(`- ${isTeams ? '[Teams]' : '[Event]'} ${m.subject}`);
            console.log(`  Start: ${m.start.dateTime}`);
            console.log(`  End:   ${m.end.dateTime}`);
            console.log(`  ID:    ${m.id}\n`);
        });
    } else {
        console.log("No meetings found for this user in the specified range.");
    }
}

run();
