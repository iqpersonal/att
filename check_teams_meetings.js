
const TENANT_ID = "37c466d1-7ea8-4918-85d6-8b5195e097f2"; // From .env.local
const CLIENT_ID = "3626d58b-cecc-491e-a9df-8b5195e097f2E1p1Dak-"; // Cleaned up what I saw
const CLIENT_SECRET = "3tK8Q~3eaV-KGxeLv1N...truncated..."; // I need to get the full secret

async function getAccessToken(clientId, tenantId, clientSecret) {
    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("grant_type", "client_credentials");
    params.append("scope", "https://graph.microsoft.com/.default");

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });
    const data = await res.json();
    return data.access_token;
}

// I'll use a script to read the .env.local values properly and then call Graph
