const admin = require('firebase-admin');

async function updateWhatsAppToken() {
    try {
        const projectId = 'tellusteams';
        const clientEmail = 'firebase-adminsdk-fbsvc@tellusteams.iam.gserviceaccount.com';
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        
        console.log('Initializing Firebase Admin...');
        
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
            console.log('Firebase Admin initialized');
        }

        const db = admin.firestore();
        const docPath = 'tenants/tellus-teams/integrations/meta';
        const newToken = 'EAALlcr5AuWYBQcwvh2KuNt7JDIg3vxk0RhPSRFsOVaNjZBvgkR5muTuIs6XyHpoFjAk5Ms22nV5RhhWEihj85KBMMDnN4nJ2XmKlBKKQtXKZBxwN1udusIx4fUWJuSZAMZAYatU0wZAsuPDy7aiZBmKDYQVP2XhCDZCWMp7ADhNUjadUNkaZBmq0226IWZCkCqhQ5QY0MNzCfKbOLbfgWayWeISuiREmzxiGcZCXv7sUa92eZBxhO5iR7P6EXB7GxoTaO2ZCyYZBY1TatLoYQUGvlH1swvAZDZD';
        
        const now = Math.floor(Date.now() / 1000);
        const ninetyDaysFromNow = now + (90 * 24 * 60 * 60);

        console.log('Reading current document...');
        const docRef = db.doc(docPath);
        const docSnap = await docRef.get();
        
        let currentVersion = 2;
        if (docSnap.exists) {
            const data = docSnap.data();
            console.log('Current document exists');
            if (data.tokenVersion !== undefined) {
                currentVersion = data.tokenVersion;
            }
        }

        const newVersion = currentVersion + 1;

        const updateData = {
            accessToken: newToken,
            refreshedAt: now,
            expiresAt: ninetyDaysFromNow,
            phoneNumberId: '786617204538778',
            refreshMethod: 'MANUAL',
            tokenVersion: newVersion,
            updatedAt: now,
        };

        console.log('Updating document...');
        await docRef.set(updateData, { merge: true });
        console.log('Document updated successfully');

        console.log('Verifying update...');
        const verifySnap = await docRef.get();
        const verifyData = verifySnap.data();
        
        const tokenFirst50 = verifyData.accessToken?.substring(0, 50);
        const expectedFirst50 = newToken.substring(0, 50);
        
        console.log('\n=== VERIFICATION RESULTS ===');
        console.log('Expected first 50 chars:', expectedFirst50);
        console.log('Actual first 50 chars:  ', tokenFirst50);
        
        if (tokenFirst50 === expectedFirst50) {
            console.log('Token matches perfectly!');
        } else {
            console.log('Token mismatch detected!');
            process.exit(1);
        }

        const refreshedAtDate = new Date(now * 1000).toISOString();
        const expiresAtDate = new Date(ninetyDaysFromNow * 1000).toISOString();

        console.log('\n=== UPDATE SUMMARY ===');
        console.log('Document: ' + docPath);
        console.log('- accessToken: Updated');
        console.log('- refreshedAt: ' + refreshedAtDate);
        console.log('- expiresAt: ' + expiresAtDate);
        console.log('- phoneNumberId: 786617204538778');
        console.log('- refreshMethod: MANUAL');
        console.log('- tokenVersion: ' + newVersion);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

updateWhatsAppToken();
