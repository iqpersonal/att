import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

// These will be used as fallbacks if no tenant configuration is found
const DEFAULT_WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const DEFAULT_WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export async function POST(req: Request) {
    try {
        const { to, templateName, components, tenantId, languageCode, text, type = "template" } = await req.json();

        let accessToken = DEFAULT_WHATSAPP_ACCESS_TOKEN;
        let phoneNumberId = DEFAULT_WHATSAPP_PHONE_NUMBER_ID;

        // [Config fetching logic remains same...]
        if (tenantId) {
            try {
                const adminDb = getAdminDb();
                const configSnap = await adminDb.doc(`tenants/${tenantId}/config/whatsapp`).get();
                const configData = configSnap.data() || {};

                // Use WhatsApp config token if available
                if (configData.accessToken) {
                    accessToken = configData.accessToken;
                }
                phoneNumberId = configData.phoneNumberId || phoneNumberId;

                // Fallback to Meta integration token only if WhatsApp token is missing
                if (!accessToken) {
                    const metaSnap = await adminDb.doc(`tenants/${tenantId}/integrations/meta`).get();
                    if (metaSnap.exists) {
                        const metaData = metaSnap.data() || {};
                        accessToken = metaData.accessToken || accessToken;
                    }
                }
            } catch (e) {
                console.error(`[WhatsApp] Error fetching config for tenant ${tenantId}:`, e);
            }
        }

        if (!accessToken || !phoneNumberId) {
            return NextResponse.json(
                { success: false, error: "WhatsApp credentials not configured for this tenant" },
                { status: 500 }
            );
        }

        const cleanTo = to.replace(/\D/g, "");
        const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

        // Build Payload based on type
        const payload: any = {
            messaging_product: "whatsapp",
            to: cleanTo,
            type: type
        };

        if (type === "template") {
            payload.template = {
                name: templateName,
                language: { code: languageCode || "en_US" },
                components: components || [],
            };
        } else if (type === "text") {
            payload.text = { body: text };
        }

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok) {
            return NextResponse.json({ success: true, data });
        } else {
            console.error("Meta WhatsApp API Error:", data);
            return NextResponse.json(
                { success: false, error: data.error?.message || "Failed to send WhatsApp message" },
                { status: response.status }
            );
        }
    } catch (error) {
        console.error("WhatsApp Route Error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
