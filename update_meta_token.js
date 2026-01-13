const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = {
  type: 'service_account',
  project_id: 'tellusteams',
  private_key_id: 'fbsvc',
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDXZ4ile25ZgNT4\nDLCYV8C9ineAXY8aYKzxbW9J9h6WP4i6t2+2s8qydFRs0dmC3StZlEQKJOhBw7+d\nUDR3tDxB0lftUd1C/aFo1070lJ2qtHMJj53bLWQNdn+zx6bZqBBWBWeY26b8ray3\nWaU6alMmyfNw+IonAZrANxgRkT9VuY9WL29ly5HKIKnvPFCESNMsYDn1NYQVlCkZ\n1216BsCJGyP6/Ur8ayOPfh4KsmIhw0SZRA9dURRR59MXZlpQHSqnk0ncu42QCGJm\nKqveW5f7yRJIil5NMwncWHqZkn/bAPNuiUV+yI1zOusn2sopnppnCsN2EyeplCQO\n0jiANmBBAgMBAAECggEABhk80a6ac7dFkFZPo6iMYPFsK7q6Y/1LuDQoe/gXapqW\n5O5vn8UcXowTndcdKOrZINqlSII9/yqrIKmWKrN0J0rsyV/Re2WR7dV2u07/3cbp\nIOKrjfqNhCIQQIdNDomHGOBjS/0gD7RdGP3VQz+iZg0+srqesrcFah7FNC4gFG20\nuIhsAXkBq9zZYbZzdEH2dvyI4hzBdMJm6ZmktbtfCo0MdUaV9WFANJnPPS+dTAHA\nhh9gHKgbXNifCCFM9PXk3RceSPHyj5XgYiYD26K8tSku3koiSqdMzZhgkUGTexMN\nruRF5O8vgKctpYh+PPmoZ0ocT6DnKcC1whxkD63cnwKBgQDsqlFPNEPUh+9zJ/qy\nlMsYTTURKhdp69Xbj4cAXGL72hqK86IKORKl+Qg1GXy+4Nd+dvnb7UoGXF6qwQg1\nHyST6htyyWg2DUkehGhqBwVlDBP513YR2R6agZQCRaWqh/FjaRVAg+ITDFD/5UHo\nqLwKUYUXwUsh3Wp53Ohec9w6xwKBgQDpAI96ghoaiwlgXgJ5NQnf/gEqf2xAcnjh\nlHJ2K36MVZYnb6eEX0oy96g4sD8o7ZTZiSi2Fs0JRlGBFdJfGhbCVxkkZd4Raxge\n+NBClEVjcj2KwIx1LvHy6/RA6kppe0YX7XPpOEj/Av/z2p5uX5R9U+HAKVW+p0YV\nsmkI4PjEtwKBgQCk+BgTgNgjZtonyF99ajCj8PWj0FZf1C/Pi53MR5oL+r1zzF5Q\nh/YS0aPB99E38Nzl36NNhXuLMYoftsy00s+Zd5/IhNJqkxo79ooeFmTRSfkGuAUq\nbdFiXB7C8q+HTpmZ9R8GSKgnJPe1WKZ3ul7RRn/izi9EHOZiqfUkGdkS8wKBgQDn\nOXwpWiUnhCTY8lJIEH9tPvfPQcaeqjsVuahhZsZd461wE1jNf3b131mccCMtraAS\nxQ+WrEfrVVIa5Rnw8MX3NFIqEcFvzbSRP+AEwnmdt8glAvIgdGb86HVrWlZgGUq1\nAhsOLaIbF9IDIEgrRkTonq6gcSS7X+qoK3Yaro+RPwKBgBbaqV6bXYOL0BJlCGUD\nlGSzXqh+1nQutqBSoV04xAOzaL/gd8WIP95+/bYMtPp9Bkq6/sy9KSyJoHKMIvJ+\n3IsCtxHtE3kyeXxELIFLVidQQ+TFt7codeOdwEpyRZf6BXHWdUj50JG6U17x59Ok\n3YjCWgnE1LHHzmr3ySZYZQq9\n-----END PRIVATE KEY-----\n",
  client_email: 'firebase-adminsdk-fbsvc@tellusteams.iam.gserviceaccount.com',
  client_id: '114632697357699031948',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function updateMetaToken() {
  try {
    const newAccessToken = 'EAALlcr5AuWYBQZAr2ADI9E4NC6GgKFthMXmEsZBZBoqzZBWXrJ48kZBOO7vL3cd8UgSMxn4xbbmFUZBOitxM7xJRXIy1BlX0XWWZCZALIk1fJYzs3ECkIOSoJNWN94MoHtng2IhKmQFFSaDIPej1UR94ZCc47248jG0FfhXWDd3ZARANwOGpt12D7DcjqnaMvcRaMMYgZDZD';
    
    const currentTime = Math.floor(Date.now() / 1000); // Current Unix timestamp
    const expiresAt = currentTime + (365 * 24 * 60 * 60); // +365 days in seconds

    const updateData = {
      accessToken: newAccessToken,
      expiresAt: expiresAt,
      refreshedAt: currentTime,
      tokenVersion: 2,
      refreshMethod: 'SYSTEM_USER',
    };

    const docRef = db.collection('tenants').doc('tellus-teams').collection('integrations').doc('meta');
    
    console.log('Updating Firestore document at: tenants/tellus-teams/integrations/meta');
    console.log('Update data:', updateData);
    
    await docRef.update(updateData);
    
    console.log(' Token updated successfully!');
    console.log('New token (first 50 chars):', newAccessToken.substring(0, 50) + '...');
    console.log('Expires at:', new Date(expiresAt * 1000).toISOString());
    console.log('Refreshed at:', new Date(currentTime * 1000).toISOString());
    
    process.exit(0);
  } catch (error) {
    console.error(' Error updating token:', error.message);
    process.exit(1);
  }
}

updateMetaToken();
