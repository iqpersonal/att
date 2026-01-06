
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function listTenants() {
    const snapshot = await db.collection('tenants').get();
    const tenants = [];
    snapshot.forEach(doc => {
        tenants.push({ id: doc.id, ...doc.data() });
    });
    console.log(JSON.stringify(tenants, null, 2));
}

listTenants();
