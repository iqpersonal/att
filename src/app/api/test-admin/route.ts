import { getAdminDb } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || "tellus-teams";

    try {
        console.log(`[Diagnostic] Testing Firestore access for tenant: ${tenantId}`);
        const adminDb = getAdminDb();
        const configRef = adminDb.collection("tenants").doc(tenantId).collection("config").doc("teams");
        const configSnap = await configRef.get();

        if (configSnap.exists) {
            const data = configSnap.data();
            return NextResponse.json({
                status: "success",
                message: "Admin SDK is working and can read Firestore!",
                tenantId,
                foundCredentials: {
                    clientId: data?.azureClientId ? `${data.azureClientId.substring(0, 5)}...` : "missing",
                    tenantId: data?.azureTenantId ? `${data.azureTenantId.substring(0, 5)}...` : "missing",
                    hasSecret: !!data?.azureClientSecret
                }
            });
        } else {
            return NextResponse.json({
                status: "warning",
                message: `Admin SDK is working, but no config was found at tenants/${tenantId}/config/teams`,
                tenantId
            });
        }
    } catch (error: any) {
        console.error("[Diagnostic] Error:", error);
        return NextResponse.json({
            status: "error",
            message: "Admin SDK FAILED to read Firestore. Check your FIREBASE_PRIVATE_KEY in .env.local",
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
