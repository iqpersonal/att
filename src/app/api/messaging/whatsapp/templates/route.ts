import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const tenantId = searchParams.get("tenantId") || "tellus-teams";

        const adminDb = getAdminDb();

        // 1. Fetch Legacy WhatsApp config first (Dedicated WhatsApp Token)
        const configSnap = await adminDb.doc(`tenants/${tenantId}/config/whatsapp`).get();
        const configData = configSnap.data() || {};

        // 2. Fetch centralized Meta integration for fallback
        const metaSnap = await adminDb.doc(`tenants/${tenantId}/integrations/meta`).get();
        const metaData = metaSnap.data() || {};

        const accessToken = configData.accessToken || metaData.accessToken;
        const wabaId = configData.wabaId;

        if (!accessToken || !wabaId) {
            console.error(`[Templates] Missing credentials for tenant: ${tenantId}. Token: ${!!accessToken}, WABA: ${!!wabaId}`);
            return NextResponse.json({
                success: false,
                error: !accessToken ? "Meta Access Token missing in Integrations" : "WABA ID missing in Settings"
            }, { status: 400 });
        }

        const url = `https://graph.facebook.com/v21.0/${wabaId}/message_templates?limit=100`;
        console.log(`[Templates] WABA: ${wabaId}, URL: ${url}`);

        try {
            const response = await fetch(url, {
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                },
                next: { revalidate: 0 }
            });

            const responseText = await response.text();
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (pE) {
                console.error("[Templates] Meta Non-JSON Response:", responseText);
                return NextResponse.json({ success: false, error: "Invalid response from Meta API" }, { status: 500 });
            }

            if (!response.ok) {
                console.error("[Templates] Meta Error:", responseData);
                return NextResponse.json({
                    success: false,
                    error: `Meta Error: ${responseData.error?.message || "Unknown error"}`
                }, { status: response.status });
            }

            if (!responseData.data || !Array.isArray(responseData.data)) {
                console.error("[Templates] Unexpected data format:", responseData);
                return NextResponse.json({ success: false, error: "Invalid data format from Meta" }, { status: 500 });
            }

            // Filter for APPROVED templates only
            const templates = responseData.data
                .filter((t: any) => t.status === "APPROVED")
                .map((t: any) => ({
                    name: t.name,
                    language: t.language,
                    category: t.category,
                    components: t.components
                }));

            console.log(`[Templates] Success! Found ${templates.length} templates`);
            return NextResponse.json({ success: true, templates });
        } catch (fetchError: any) {
            console.error("[Templates] Fetch Exception:", fetchError);
            return NextResponse.json({ success: false, error: "Failed to connect to Meta API" }, { status: 500 });
        }
    } catch (error: any) {
        console.error("[Templates] Outer Exception:", error);
        return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
    }
}
