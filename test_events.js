
const fs = require('fs');

async function run() {
    const content = fs.readFileSync('.env.local', 'utf8');
    const getVal = (key) => content.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.trim();

    const clientId = getVal('AZURE_AD_CLIENT_ID');
    const tenantId = getVal('AZURE_AD_TENANT_ID');
    const clientSecret = getVal('AZURE_AD_CLIENT_SECRET');

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("grant_type", "client_credentials");
    params.append("scope", "https://graph.microsoft.com/.default");

    try {
        const res = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params
        });
        const data = await res.json();
        const token = data.access_token;

        const targetUser = "admin@tellusonlinela.onmicrosoft.com";
        console.log(`Checking events for ${targetUser}...`);

        // Try /events instead of /calendarView
        const meetRes = await fetch(`https://graph.microsoft.com/v1.0/users/${targetUser}/events?$select=subject,start,end,onlineMeeting,isOnlineMeeting&$top=10`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const meetData = await meetRes.json();

        if (meetData.error) {
            console.error("Graph Error:", JSON.stringify(meetData.error, null, 2));
            return;
        }

        if (meetData.value && meetData.value.length > 0) {
            console.log("\nRecent Meetings:");
            meetData.value.forEach(m => {
                console.log(`- ${m.subject} (${m.start.dateTime})`);
            });
        } else {
            console.log("No meetings found.");
        }
    } catch (e) {
        console.error("Fatal Error:", e);
    }
}

run();
