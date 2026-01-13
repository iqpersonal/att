const admin = require('firebase-admin');

async function updateWabaId() {
    try {
        const projectId = 'tellusteams';
        const clientEmail = 'firebase-adminsdk-fbsvc@tellusteams.iam.gserviceaccount.com';
        let privateKey = 'MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDXZ4ile25ZgNT4\nDLCYV8C9ineAXY8aYKzxbW9J9h6WP4i6t2+2s8qydFRs0dmC3StZlEQKJOhBw7+d\nUDR3tDxB0lftUd1C/aFo1070lJ2qtHMJj53bLWQNdn+zx6bZqBBWBWeY26b8ray3\nWaU6alMmyfNw+IonAZrANxgRkT9VuY9WL29ly5HKIKnvPFCESNMsYDn1NYQVlCkZ\n1216BsCJGyP6/Ur8ayOPfh4KsmIhw0SZRA9dURRR59MXZlpQHSqnk0ncu42QCGJm\nKqveW5f7yRJIil5NMwncWHqZkn/bAPNuiUV+yI1zOusn2sopnppnCsN2EyeplCQO\n0jiANmBBAgMBAAECggEABhk80a6ac7dFkFZPo6iMYPFsK7q6Y/1LuDQoe/gXapqW\n5O5vn8UcXowTndcdKOrZINqlSII9/yqrIKmWKrN0J0rsyV/Re2WR7dV2u07/3cbp\nIOKrjfqNhCIQQIdNDomHGOBjS/0gD7RdGP3VQz+iZg0+srqesrcFah7FNC4gFG20\nuIhsAXkBq9zZYbZzdEH2dvyI4hzBdMJm6ZmktbtfCo0MdUaV9WFANJnPPS+dTAHA\nhh9gHKgbXNifCCFM9PXk3RceSPHyj5XgYiYD26K8tSku3koiSqdMzZhgkUGTexMN\nruRF5O8vgKctpYh+PPmoZ0ocT6DnKcC1whxkD63cnwKBgQDsqlFPNEPUh+9zJ/qy\nlMsYTTURKhdp69Xbj4cAXGL72hqK86IKORKl+Qg1GXy+4Nd+dvnb7UoGXF6qwQg1\nHyST6htyyWg2DUkehGhqBwVlDBP513YR2R6agZQCRaWqh/FjaRVAg+ITDFD/5UHo\nqLwKUYUXwUsh3Wp53Ohec9w6xwKBgQDpAI96ghoaiwlgXgJ5NQnf/gEqf2xAcnjh\nlHJ2K36MVZYnb6eEX0oy96g4sD8o7ZTZiSi2Fs0JRlGBFdJfGhbCVxkkZd4Raxge\n+NBClEVjcj2KwIx1LvHy6/RA6kppe0YX7XPpOEj/Av/z2p5uX5R9U+HAKVW+p0YV\nsmkI4PjEtwKBgQCk+BgTgNgjZtonyF99ajCj8PWj0FZf1C/Pi53MR5oL+r1zzF5Q\nh/YS0aPB99E38Nzl36NNhXuLMYoftsy00s+Zd5/IhNJqkxo79ooeFmTRSfkGuAUq\nbdFiXB7C8q+HTpmZ9R8GSKgnJPe1WKZ3ul7RRn/izi9EHOZiqfUkGdkS8wKBgQDn\nOXwpWiUnhCTY8lJIEH9tPvfPQcaeqjsVuahhZsZd461wE1jNf3b131mccCMtraAS\nxQ+WrEfrVVIa5Rnw8MX3NFIqEcFvzbSRP+AEwnmdt8glAvIgdGb86HVrWlZgGUq1\nAhsOLaIbF9IDIEgrRkTonq6gcSS7X+qoK3Yaro+RPwKBgBbaqV6bXYOL0BJlCGUD\nlGSzXqh+1nQutqBSoV04xAOzaL/gd8WIP95+/bYMtPp9Bkq6/sy9KSyJoHKMIvJ+\n3IsCtxHtE3kyeXxELIFLVidQQ+TFt7codeOdwEpyRZf6BXHWdUj50JG6U17x59Ok\n3YjCWgnE1LHHzmr3ySZYZQq9';
        
        const wabaId = '25425371247051012';
        
        console.log('[WABA Update] Initializing Firebase Admin...');
        
        // Use the exact private key from .env.local
        const fullPrivateKey = '-----BEGIN PRIVATE KEY-----\n' + privateKey + '\n-----END PRIVATE KEY-----';

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey: fullPrivateKey,
                }),
                projectId,
            });
            console.log('[WABA Update] Firebase Admin initialized');
        }

        const db = admin.firestore();
        const docPath = 'tenants/tellus-teams/integrations/meta';
        const docRef = db.doc(docPath);

        console.log('[WABA Update] Reading current document...');
        const currentSnap = await docRef.get();
        const currentData = currentSnap.data();
        console.log('[WABA Update] Current document exists:', currentSnap.exists);

        const now = Math.floor(Date.now() / 1000);
        
        console.log('[WABA Update] Updating document with wabaId...');
        await docRef.set({
            wabaId: wabaId,
            updatedAt: now,
        }, { merge: true });
        console.log('[WABA Update] Document updated successfully');

        console.log('[WABA Update] Verifying update...');
        const verifySnap = await docRef.get();
        const verifyData = verifySnap.data();
        
        if (verifyData.wabaId === wabaId) {
            console.log('\n=== SUCCESS ===');
            console.log('wabaId field added: ' + wabaId);
            console.log('Document path: ' + docPath);
            console.log('Verification: PASSED');
            console.log('\nFull document data:');
            console.log(JSON.stringify(verifyData, null, 2));
        } else {
            console.error('[WABA Update] Verification failed - wabaId mismatch');
            process.exit(1);
        }

        process.exit(0);
    } catch (error) {
        console.error('[WABA Update] Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

updateWabaId();
