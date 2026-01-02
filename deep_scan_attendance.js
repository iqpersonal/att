
const fs = require('fs');

async function run() {
    const content = fs.readFileSync('.env.local', 'utf8');
    const getVal = (key) => content.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.trim();

    const clientId = getVal('AZURE_AD_CLIENT_ID');
    const tenantId = getVal('AZURE_AD_TENANT_ID');
    const clientSecret = getVal('AZURE_AD_CLIENT_SECRET');
    const targetEmail = "admin@tellusonlinela.onmicrosoft.com";

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("grant_type", "client_credentials");
    params.append("scope", "https://graph.microsoft.com/.default");

    console.log("Acquiring token...");
    const tres = await fetch(tokenUrl, { method: "POST", body: params });
    const tdata = await tres.json();
    const token = tdata.access_token;

    console.log(`\n--- Deep Scanning Reports for ${targetEmail} ---`);

    // We fetch all online meetings first
    const meetRes = await fetch(`https://graph.microsoft.com/v1.0/users/${targetEmail}/onlineMeetings`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const meetData = await meetRes.json();

    if (!meetData.value || meetData.value.length === 0) {
        console.log("No Teams meeting sessions found in this mailbox history.");
        return;
    }

    for (const meeting of meetData.value) {
        console.log(`\nChecking Meeting: ${meeting.subject} (ID: ${meeting.id})`);

        const reportRes = await fetch(`https://graph.microsoft.com/v1.0/users/${targetEmail}/onlineMeetings/${meeting.id}/attendanceReports`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const reportData = await reportRes.json();

        if (reportData.value && reportData.value.length > 0) {
            console.log(`✅ FOUND ${reportData.value.length} reports!`);
            for (const r of reportData.value) {
                console.log(`   - Report from: ${r.meetingStartDateTime} (Total participants: ${r.totalParticipantCount})`);
            }
        } else {
            console.log(`❌ No attendance reports for this session.`);
        }
    }
}

run();
