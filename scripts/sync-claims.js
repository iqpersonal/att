const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const auth = admin.auth();

async function syncAllClaims() {
    console.log("--- Starting Claims Sync ---");
    const usersSnap = await db.collection("users").get();

    let processed = 0;
    let errors = 0;

    for (const doc of usersSnap.docs) {
        const userData = doc.data();
        const uid = doc.id;
        const role = userData.role || "admin";
        const tenantId = userData.tenantId || null;

        try {
            console.log(`[Sync] Setting claims for ${userData.email} (${uid}): role=${role}, tenantId=${tenantId}`);
            await auth.setCustomUserClaims(uid, {
                role: role,
                tenantId: tenantId
            });
            processed++;
        } catch (err) {
            console.error(`[Error] Failed to set claims for ${uid}:`, err.message);
            errors++;
        }
    }

    console.log(`\n--- Sync Complete ---`);
    console.log(`Processed: ${processed}`);
    console.log(`Errors: ${errors}`);
    console.log(`Note: Users will need to refresh their session (logout/login or getIdToken(true)) to see changes.`);
}

syncAllClaims().then(() => process.exit(0)).catch(err => {
    console.error("Fatal Error:", err);
    process.exit(1);
});
