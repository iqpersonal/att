const admin = require('firebase-admin');

async function addWabaId() {
    try {
        const projectId = 'tellusteams';
        const clientEmail = 'firebase-adminsdk-fbsvc@tellusteams.iam.gserviceaccount.com';
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        
        if (!privateKey) {
            console.error('Missing FIREBASE_PRIVATE_KEY');
            process.exit(1);
        }

        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.substring(1, privateKey.length - 1);
        }
        privateKey = privateKey.replace(/\\n/g, '\n');

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
                projectId,
            });
        }

        const db = admin.firestore();
        const docPath = 'tenants/tellus-teams/integrations/meta';
        const docRef = db.doc(docPath);
        
        // Add WABA ID to the document
        await docRef.update({
            wabaId: '25425371247051012'
        });
        
        console.log('Updated Firestore with WABA ID');
        
        // Verify
        const snap = await docRef.get();
        console.log('Current document:', snap.data());
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

addWabaId();
