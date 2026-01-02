
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

    const projectId = getVal('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    const clientEmail = getVal('FIREBASE_CLIENT_EMAIL');
    const privateKey = formatPrivateKey(getVal('FIREBASE_PRIVATE_KEY'));

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
            projectId
        });
    }

    const db = admin.firestore();
    const doc = await db.collection("tenants").doc("tellus-teams").get();
    if (doc.exists) {
        console.log("Tenant tellus-teams EXISTS");
        const config = await db.collection("tenants").doc("tellus-teams").collection("config").doc("teams").get();
        if (config.exists) {
            console.log("Teams config for tellus-teams EXISTS:", JSON.stringify(config.data(), null, 2));
        } else {
            console.log("Teams config for tellus-teams MISSING");
        }
    } else {
        console.log("Tenant tellus-teams MISSING");
    }
}

run();
