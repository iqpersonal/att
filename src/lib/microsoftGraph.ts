import { Client } from "@microsoft/microsoft-graph-client";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { refreshMicrosoftToken } from "./tokenService";

export function getGraphClient(accessToken: string) {
    return Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        },
    });
}

export async function getGraphClientForUser(userId: string) {
    const userSnap = await getDoc(doc(db, "users", userId));
    const data = userSnap.data();

    if (!data?.microsoftTokens) throw new Error("Microsoft account not linked");

    const { accessToken, refreshToken, expiresAt } = data.microsoftTokens;

    // Check if token is expired (with 5 min buffer)
    const isExpired = expiresAt && (expiresAt < (Date.now() / 1000 + 300));

    if (isExpired && refreshToken) {
        const newTokens = await refreshMicrosoftToken(refreshToken);
        // Save new tokens back to Firestore
        await updateDoc(doc(db, "users", userId), {
            microsoftTokens: {
                ...newTokens,
                updatedAt: new Date().toISOString(),
            }
        });
        return getGraphClient(newTokens.accessToken);
    }

    return getGraphClient(accessToken);
}
