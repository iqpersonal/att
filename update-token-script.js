const admin = require('firebase-admin');

async function updateWhatsAppToken() {
    try {
        // Initialize Firebase Admin SDK with environment variables
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tellusteams';
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        
        if (!privateKey) {
            console.error('Missing FIREBASE_PRIVATE_KEY');
            process.exit(1);
        }

        // Handle private key formatting
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.substring(1, privateKey.length - 1);
        }
        privateKey = privateKey.replace(/\\n/g, '\n');

        if (!clientEmail) {
            console.error('Missing Firebase credentials');
            process.exit(1);
        }

        // Initialize if not already done
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
        const newToken = 'EAALlcr5AuWYBQcwvh2KuNt7JDIg3vxk0RhPSRFsOVaNjZBvgkR5muTuIs6XyHpoFjAk5Ms22nV5RhhWEihj85KBMMDnN4nJ2XmKlBKKQtXKZBxwN1udusIx4fUWJuSZAMZAYatU0wZAsuPDy7aiZBmKDYQVP2XhCDZCWMp7ADhNUjadUNkaZBmq0226IWZCkCqhQ5QY0MNzCfKbOLbfgWayWeISuiREmzxiGcZCXv7sUa92eZBxhO5iR7P6EXB7GxoTaO2ZCyYZBY1TatLoYQUGvlH1swvAZDZD';
        
        // Calculate timestamps
        const now = Math.floor(Date.now() / 1000); // Current Unix timestamp
        const ninetyDaysFromNow = now + (90 * 24 * 60 * 60); // 90 days in seconds

        // First, read current document to get the current tokenVersion
        const docRef = db.doc(docPath);
        const docSnap = await docRef.get();
        
        let currentVersion = 2;
        if (docSnap.exists) {
            const data = docSnap.data();
            console.log('Current document:');
            console.log(JSON.stringify(data, null, 2));
            if (data.tokenVersion !== undefined) {
                currentVersion = data.tokenVersion;
            }
        } else {
            console.log('Document does not exist, creating new one');
        }

        // Increment version
        const newVersion = currentVersion + 1;

        // Prepare the update payload
        const updateData = {
            accessToken: newToken,
            refreshedAt: now,
            expiresAt: ninetyDaysFromNow,
            phoneNumberId: '786617204538778',
            refreshMethod: 'MANUAL',
            tokenVersion: newVersion,
            updatedAt: now,
        };

        console.log('\\nUpdating document with:');
        console.log(JSON.stringify(updateData, null, 2));

        // Update the document
        await docRef.set(updateData, { merge: true });

        console.log('\\n Document updated successfully');

        // Verify the update
        const verifySnap = await docRef.get();
        const verifyData = verifySnap.data();
        
        console.log('\\nVerification - Document after update:');
        console.log('accessToken first 50 chars:', verifyData.accessToken?.substring(0, 50));
        console.log('refreshedAt:', verifyData.refreshedAt);
        console.log('expiresAt:', verifyData.expiresAt);
        console.log('phoneNumberId:', verifyData.phoneNumberId);
        console.log('refreshMethod:', verifyData.refreshMethod);
        console.log('tokenVersion:', verifyData.tokenVersion);

        // Check first 50 characters of token
        const tokenFirst50 = verifyData.accessToken?.substring(0, 50);
        const expectedFirst50 = newToken.substring(0, 50);
        
        console.log('\\nToken verification:');
        console.log('Expected first 50 chars:', expectedFirst50);
        console.log('Actual first 50 chars:  ', tokenFirst50);
        
        if (tokenFirst50 === expectedFirst50) {
            console.log(' Token matches perfectly!');
        } else {
            console.log(' Token mismatch detected!');
            process.exit(1);
        }

        console.log('\\nUpdate Summary:');
        console.log('- accessToken: Updated ');
        console.log('- refreshedAt: ' + new Date(now * 1000).toISOString());
        console.log('- expiresAt: ' + new Date(ninetyDaysFromNow * 1000).toISOString());
        console.log('- phoneNumberId: 786617204538778 (kept) ');
        console.log('- refreshMethod: MANUAL ');
        console.log('- tokenVersion: ' + newVersion + ' ');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

updateWhatsAppToken();
