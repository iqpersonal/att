
const fs = require('fs');

async function run() {
    const content = fs.readFileSync('.env.local', 'utf8');
    const getVal = (key) => content.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.trim();

    const clientId = getVal('AZURE_AD_CLIENT_ID');
    const tenantId = getVal('AZURE_AD_TENANT_ID');
    const clientSecret = getVal('AZURE_AD_CLIENT_SECRET');
    const targetUser = "admin@tellusonlinela.onmicrosoft.com";

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("grant_type", "client_credentials");
    params.append("scope", "https://graph.microsoft.com/.default");

    const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });
    const data = await res.json();
    const token = data.access_token;

    console.log(`Checking Online Meetings for ${targetUser}...`);
    // NOTE: onlineMeetings endpoint allows discovery for all users if using Application Permissions
    const meetingsRes = await fetch(`https://graph.microsoft.com/v1.0/users/${targetUser}/onlineMeetings`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const meetingsData = await meetingsRes.json();

    if (meetingsData.error) {
        console.error("Graph Error:", meetingsData.error.message);
        return;
    }

    if (meetingsData.value && meetingsData.value.length > 0) {
        console.log("Recent Online Meetings:");
        meetingsData.value.forEach(m => {
            console.log(`- ${m.subject}`);
            console.log(`  Join URL: ${m.joinWebUrl}`);
            console.log(`  ID: ${m.id}`);
        });
    } else {
        console.log("No recent online meetings found.");
    }
}

run();
