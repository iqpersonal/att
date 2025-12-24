const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const uid = "65cIFmhmxPejbq0aObfZ4M14h9X2";
const email = "iqpersonal@gmail.com";
const tenantId = "tellusteams-admin";

async function bootstrap() {
    console.log("Bootstrapping Super Admin...");

    await db.collection("users").doc(uid).set({
        uid: uid,
        name: "Platform Admin",
        email: email,
        role: "super-admin",
        tenantId: tenantId,
        createdAt: new Date().toISOString()
    });

    await db.collection("tenants").doc(tenantId).set({
        id: tenantId,
        name: "StudioSchool Platform",
        ownerId: uid,
        status: "active",
        createdAt: new Date().toISOString(),
        features: ["leads"]
    });

    console.log("Successfully bootstrapped! Now refresh your Firebase console.");
}

bootstrap();
