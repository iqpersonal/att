
const fs = require('fs');

async function run() {
    const content = fs.readFileSync('.env.local', 'utf8');
    const getVal = (key) => content.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.trim();

    const clientId = getVal('AZURE_AD_CLIENT_ID');
    const tenantId = getVal('AZURE_AD_TENANT_ID');
    const clientSecret = getVal('AZURE_AD_CLIENT_SECRET');

    if (!clientId || !tenantId || !clientSecret) {
        console.error("Missing credentials in .env.local");
        return;
    }

    console.log("Acquiring Access Token...");
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

    if (data.error) {
        console.error("Token Error:", data.error_description || data.error);
        return;
    }

    const token = data.access_token;
    console.log("Token Acquired.");

    // 1. List Users to find a target
    console.log("\nSearching for users in the tenant...");
    const userRes = await fetch("https://graph.microsoft.com/v1.0/users?$top=5", {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const userData = await userRes.json();

    if (userData.value && userData.value.length > 0) {
        console.log("Users found:");
        userData.value.forEach(u => console.log(`- ${u.displayName} (${u.userPrincipalName})`));

        // 2. Check scheduled meetings for the first user
        const targetUser = userData.value[0].userPrincipalName;
        console.log(`\nChecking scheduled meetings for ${targetUser}...`);

        const now = new Date();
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const meetRes = await fetch(`https://graph.microsoft.com/v1.0/users/${targetUser}/calendarView?startDateTime=${start}&endDateTime=${end}&$select=subject,start,end,onlineMeeting,isOnlineMeeting`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const meetData = await meetRes.json();

        if (meetData.value && meetData.value.length > 0) {
            console.log("\nScheduled Meetings:");
            meetData.value.forEach(m => {
                if (m.isOnlineMeeting || m.onlineMeeting) {
                    console.log(`- [Teams] ${m.subject} (${m.start.dateTime} to ${m.end.dateTime})`);
                } else {
                    console.log(`- [Event] ${m.subject} (${m.start.dateTime} to ${m.end.dateTime})`);
                }
            });
        } else {
            console.log("No meetings found in the last/next 7 days.");
        }
    } else {
        console.log("No users found or missing 'User.Read.All' permission.");
    }
}

run();
