import { getAdminDb } from "@/lib/firebaseAdmin";

interface AzureCredentials {
    clientId: string;
    tenantId: string;
    clientSecret: string;
    azureCoordinatorEmail?: string;
}

export async function getAzureCredentials(tenantId: string): Promise<AzureCredentials | null> {
    console.log(`[Azure Auth] --- Starting Credential Lookup for: ${tenantId} ---`);

    // 1. Try Firestore First (Prioritized)
    try {
        const adminDb = getAdminDb();
        const configRef = adminDb.collection("tenants").doc(tenantId).collection("config").doc("teams");
        const configSnap = await configRef.get();

        if (configSnap.exists) {
            const data = configSnap.data();
            console.log(`[Azure Auth] Found Firestore Config for ${tenantId}`);

            if (data && data.azureClientId && data.azureTenantId && data.azureClientSecret) {
                console.log(`[Azure Auth] SUCCESS: Using Firestore credentials for ${tenantId}`);
                return {
                    clientId: data.azureClientId,
                    tenantId: data.azureTenantId,
                    clientSecret: data.azureClientSecret,
                    azureCoordinatorEmail: data.azureCoordinatorEmail
                };
            } else {
                console.log("[Azure Auth] Firestore doc exists but some fields are missing.");
            }
        } else {
            console.log(`[Azure Auth] No Firestore document found at: tenants/${tenantId}/config/teams`);
        }
    } catch (error: any) {
        console.error(`[Azure Auth] Firestore connection error (likely server permissions): ${error.message}`);
    }

    // 2. Try Environment Variables Fallback
    console.log("[Azure Auth] Attempting Environment Variable fallback...");

    if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_TENANT_ID && process.env.AZURE_AD_CLIENT_SECRET) {
        console.log("[Azure Auth] SUCCESS: Using credentials from .env.local");
        return {
            clientId: process.env.AZURE_AD_CLIENT_ID,
            tenantId: process.env.AZURE_AD_TENANT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
            azureCoordinatorEmail: process.env.AZURE_COORDINATOR_EMAIL
        };
    }

    console.log("[Azure Auth] FAILED: No credentials found in Firestore or Environment.");
    return null;
}

export async function getAppAccessToken(credentials: AzureCredentials) {
    const url = `https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`;
    console.log(`[Azure Auth] Requesting access token from: ${url}`);
    console.log(`[Azure Auth] Using Client ID: ${credentials.clientId}`);

    const params = new URLSearchParams();
    params.append("client_id", credentials.clientId);
    params.append("client_secret", credentials.clientSecret);
    params.append("grant_type", "client_credentials");
    params.append("scope", "https://graph.microsoft.com/.default");

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const data = await response.json();

    if (!response.ok) {
        console.error(`[Azure Auth] TOKEN ERROR: ${data.error_description || data.error}`);
        throw new Error(data.error_description || "Failed to get access token");
    }

    console.log("[Azure Auth] TOKEN SUCCESS: Received app access token.");
    return data.access_token;
}
