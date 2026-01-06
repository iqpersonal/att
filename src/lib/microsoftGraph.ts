import { Client } from "@microsoft/microsoft-graph-client";
import { getAdminDb } from "./firebaseAdmin";
import { refreshMicrosoftToken } from "./tokenService";

export function getGraphClient(accessToken: string) {
    return Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        },
    });
}

export async function getGraphClientForUser(userId: string, forceRefresh = false) {
    const db = getAdminDb();
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    const data = userSnap.data();

    if (!data?.microsoftTokens) throw new Error("Microsoft account not linked");

    const { accessToken, refreshToken, expiresAt } = data.microsoftTokens;

    // Check if token is expired (with 5 min buffer) or force refresh is requested
    const isExpired = expiresAt && (expiresAt < (Date.now() / 1000 + 300));

    if ((isExpired || forceRefresh) && refreshToken) {
        try {
            const newTokens = await refreshMicrosoftToken(refreshToken);
            // Save new tokens back to Firestore using Admin SDK
            await userRef.update({
                microsoftTokens: {
                    ...newTokens,
                    updatedAt: new Date().toISOString(),
                }
            });
            return getGraphClient(newTokens.accessToken);
        } catch (error) {
            console.error("Error refreshing token:", error);
            // If refresh fails, we might still try to use the old token as a last resort, 
            // or just throw. Throwing is probably safer as the token is likely bad.
            throw error;
        }
    }

    return getGraphClient(accessToken);
}
