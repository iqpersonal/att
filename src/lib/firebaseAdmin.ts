import { cert, getApps, initializeApp, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Helper to clean private key strings that might have quotes or escaped newlines
function formatPrivateKey(key: string | undefined) {
    if (!key) return undefined;
    // Remove wrapping quotes if they exist
    let cleaned = key.trim();
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    // Standardize newlines
    return cleaned.replace(/\\n/g, "\n");
}

// Use a global variable to persist the Firestore instance across hot-reloads and environment shifts
let cachedDb: any = null;

export const getAdminDb = () => {
    // Return from cache if already initialized
    if (cachedDb) return cachedDb;

    try {
        const apps = getApps();
        let app;

        // If an app already exists, use the first one (usually the [DEFAULT] one)
        // This avoids "The default Firebase app does not exist" error from getApp()
        if (apps.length > 0) {
            console.log(`[Firebase Admin] Using existing app instance (${apps.length} total)...`);
            app = apps[0];
        } else {
            const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tellusteams";
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

            if (clientEmail && privateKey) {
                console.log("[Firebase Admin] Initializing with Service Account credentials...");
                app = initializeApp({
                    credential: cert({
                        projectId,
                        clientEmail,
                        privateKey,
                    }),
                    projectId
                });
            } else {
                console.log("[Firebase Admin] Initializing with default cloud credentials...");
                // Always provide projectId for robustness in different environments
                app = initializeApp({ projectId });
            }
        }

        if (!app) {
            throw new Error("Failed to resolve or initialize Firebase Admin App.");
        }

        cachedDb = getFirestore(app);
        return cachedDb;
    } catch (error: any) {
        console.error("[Firebase Admin] Fatal Initialization Error:", error.message);
        throw new Error(`Database connection failed: ${error.message}`);
    }
};
