
const fs = require('fs');
const admin = require('firebase-admin');

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

    const projectId = getVal('NEXT_PUBLIC_FIREBASE_PROJECT_ID') || "tellusteams";
    const clientEmail = getVal('FIREBASE_CLIENT_EMAIL');
    const privateKey = formatPrivateKey(getVal('FIREBASE_PRIVATE_KEY'));

    if (!clientEmail || !privateKey) {
        console.error("Missing Firebase credentials");
        return;
    }

    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
            projectId
        });

        const db = admin.firestore();
        console.log("Searching for users with Microsoft tokens...");
        const snapshot = await db.collection("users").get();
        const users = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(u => u.microsoftTokens);

        console.log("Users found:", JSON.stringify(users.map(u => ({ id: u.id, email: u.email })), null, 2));

        if (users.length > 0) {
            const user = users[0];
            const tokens = user.microsoftTokens;
            console.log(`\nFound tokens for ${user.email}. Attempting to fetch meetings...`);

            const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendar/calendarView?startDateTime=${new Date().toISOString()}&endDateTime=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}`, {
                headers: { "Authorization": `Bearer ${tokens.accessToken}` }
            });
            const data = await res.json();

            if (data.error) {
                console.error("Graph Error:", data.error.message);
                if (data.error.code === "InvalidAuthenticationToken") {
                    console.log("Token likely expired. Refreshing tokens is required.");
                }
            } else {
                console.log("Meetings found:", JSON.stringify(data.value, null, 2));
            }
        } else {
            console.log("No users have linked their Microsoft accounts yet.");
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
