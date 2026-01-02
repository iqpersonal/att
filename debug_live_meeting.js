
const fs = require('fs');
const fetch = require('node-fetch');

// Mocking some needed functionality
function formatPrivateKey(key) {
    if (!key) return undefined;
    let cleaned = key.trim();
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    return cleaned.replace(/\\n/g, "\n");
}

async function run() {
    const content = fs.readFileSync('.env.local', 'utf8');
    const lines = content.split('\n');
    const getVal = (key) => lines.find(l => l.startsWith(key))?.split('=')[1]?.trim();

    const clientId = getVal('AZURE_AD_CLIENT_ID');
    const tenantId = getVal('AZURE_AD_TENANT_ID');
    const clientSecret = getVal('AZURE_AD_CLIENT_SECRET');
    const coordinatorEmail = "admin@tellusonlinela.onmicrosoft.com";

    console.log("Fetching token...");
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

    const joinUrl = 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_MmI1YjQxYTAtODVlYi00ZDNjLWFjOTYtM2MzZTNlNDkyNTZl%40thread.v2/0?context=%7b%22Tid%22%3a%2237c466d1-7ea8-4918-85d6-8b5195e097f2%22%2c%22Oid%22%3a%220467d443-90f8-4186-957b-7b22e70a7352%22%7d';

    console.log(`Searching for meeting with Join URL...`);
    // Try both with and without context
    const meetingRes = await fetch(`https://graph.microsoft.com/v1.0/users/${coordinatorEmail}/onlineMeetings?$filter=joinWebUrl eq '${joinUrl.replace(/'/g, "''")}'`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const meetings = await meetingRes.json();
    console.log("Meeting Search Result:", JSON.stringify(meetings, null, 2));

    if (meetings.value && meetings.value.length > 0) {
        const meetingId = meetings.value[0].id;
        console.log(`Found Meeting ID: ${meetingId}. Fetching attendance reports...`);

        const reportsRes = await fetch(`https://graph.microsoft.com/v1.0/users/${coordinatorEmail}/onlineMeetings/${meetingId}/attendanceReports`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const reports = await reportsRes.json();
        console.log("Attendance Reports:", JSON.stringify(reports, null, 2));
    } else {
        console.log("Meeting not found by Join URL. Trying to list all recent online meetings for user...");
        const allRes = await fetch(`https://graph.microsoft.com/v1.0/users/${coordinatorEmail}/onlineMeetings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const all = await allRes.json();
        console.log("All Online Meetings (first few):", JSON.stringify(all.value?.slice(0, 5), null, 2));
    }
}

run();
