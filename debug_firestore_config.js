
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
        console.log("Connected to Firestore. Fetching tenants...");
        const snapshot = await db.collection("tenants").get();
        const tenants = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log("Tenants found:", JSON.stringify(tenants, null, 2));

        for (const tenant of tenants) {
            console.log(`\nChecking config for tenant: ${tenant.id}`);
            const configSnap = await db.collection("tenants").doc(tenant.id).collection("config").doc("teams").get();
            if (configSnap.exists) {
                console.log(`Config for ${tenant.id}:`, JSON.stringify(configSnap.data(), null, 2));
            } else {
                console.log(`No team config for ${tenant.id}`);
            }
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
