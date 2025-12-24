import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function saveMicrosoftTokens(userId: string, tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
}) {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        microsoftTokens: {
            ...tokens,
            updatedAt: new Date().toISOString(),
        }
    });
}

export async function refreshMicrosoftToken(refreshToken: string) {
    const url = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: process.env.AZURE_AD_CLIENT_ID!,
            client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            scope: "openid profile email User.Read OnlineMeetings.Read OnlineMeetingArtifact.Read.All offline_access",
        }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error_description || "Failed to refresh token");

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Microsoft might not always return a new refresh token
        expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
    };
}
