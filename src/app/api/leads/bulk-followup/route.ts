import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

const DEFAULT_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const DEFAULT_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export async function POST(req: Request) {
    try {
        const { leadIds, tenantId, templateName, languageCode, components } = await req.json();

        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return NextResponse.json({ success: false, error: "No leads selected" }, { status: 400 });
        }

        const adminDb = getAdminDb();

        // 1. Fetch WhatsApp Config
        let accessToken = DEFAULT_ACCESS_TOKEN;
        let phoneNumberId = DEFAULT_PHONE_ID;

        const metaSnap = await adminDb.doc(`tenants/${tenantId}/integrations/meta`).get();
        if (metaSnap.exists) {
            accessToken = metaSnap.data()?.accessToken || accessToken;
        }

        const configSnap = await adminDb.doc(`tenants/${tenantId}/config/whatsapp`).get();
        if (configSnap.exists) {
            const data = configSnap.data() || {};
            accessToken = data.accessToken || accessToken;
            phoneNumberId = data.phoneNumberId || phoneNumberId;
        }

        if (!accessToken || !phoneNumberId) {
            return NextResponse.json({ success: false, error: "WhatsApp not configured" }, { status: 500 });
        }

        // 2. Fetch Leads to get phone numbers
        const results = [];
        const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

        for (const leadId of leadIds) {
            try {
                const leadDoc = await adminDb.collection("leads").doc(leadId).get();
                if (!leadDoc.exists) continue;

                const leadData = leadDoc.data();
                if (!leadData?.phone) continue;

                const phone = leadData.phone.replace(/\D/g, "");

                // Build dynamic components based on lead data if needed
                // For now, we use the components passed from UI or a default
                const finalComponents = components || [
                    {
                        type: "body",
                        parameters: [
                            { type: "text", text: leadData.fullName || "there" }
                        ]
                    }
                ];

                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        messaging_product: "whatsapp",
                        to: phone,
                        type: "template",
                        template: {
                            name: templateName || "acknowledgement_01",
                            language: { code: languageCode || "en_US" },
                            components: finalComponents
                        }
                    }),
                });

                const data = await response.json();
                if (response.ok) {
                    // Update lead status/timestamp
                    await leadDoc.ref.update({
                        status: "contacted",
                        updatedAt: new Date(),
                        lastFollowUp: new Date()
                    });

                    // Log activity
                    await leadDoc.ref.collection("activities").add({
                        type: "whatsapp",
                        content: `Bulk Follow-up sent: ${templateName || "acknowledgement_01"}`,
                        createdAt: new Date(),
                        userId: "system" // Or take from request if available
                    });

                    results.push({ leadId, success: true });
                } else {
                    results.push({ leadId, success: false, error: data.error?.message });
                }
            } catch (err: any) {
                results.push({ leadId, success: false, error: err.message });
            }
        }

        const successCount = results.filter(r => r.success).length;

        return NextResponse.json({
            success: true,
            message: `Successfully followed up with ${successCount}/${leadIds.length} leads`,
            results
        });

    } catch (error: any) {
        console.error("[Bulk Follow-up Error]:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
