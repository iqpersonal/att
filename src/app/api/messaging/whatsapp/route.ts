import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getValidWhatsAppToken } from "@/lib/tokenService";

console.log("[WhatsApp API] Route loaded");

export async function POST(req: Request) {
    const requestId = Date.now();
    console.log(`[${requestId}] WhatsApp request started`);
    
    try {
        let body = await req.json();
        console.log(`[${requestId}] Body parsed:`, { to: body.to, type: body.type });

        const { to, templateName, components, languageCode, text, type = "template", tenantId = "tellus-teams" } = body;
        console.log(`[${requestId}] Tenant ID:`, tenantId);

        let accessToken: string;
        let phoneNumberId: string;

        try {
            // Get and validate token - handles refresh and expiration
            accessToken = await getValidWhatsAppToken(tenantId);
            console.log(`[${requestId}] Token retrieved and validated`);

            // Get phone number ID and other config from Firestore
            const db = getAdminDb();
            const metaConfigRef = db.doc(`tenants/${tenantId}/integrations/meta`);
            const metaConfigSnap = await metaConfigRef.get();

            if (!metaConfigSnap.exists) {
                return NextResponse.json(
                    { error: "WhatsApp not configured. Please connect your account in Settings." },
                    { status: 400 }
                );
            }

            const metaConfig = metaConfigSnap.data();
            phoneNumberId = metaConfig?.phoneNumberId;

            if (!phoneNumberId) {
                return NextResponse.json(
                    { error: "Phone number ID not configured" },
                    { status: 400 }
                );
            }

            console.log(`[${requestId}] Configuration retrieved`);

        } catch (configError: any) {
            console.error(`[${requestId}] Configuration error:`, configError);

            // Handle specific token errors
            if (configError.message?.includes("expired")) {
                return NextResponse.json(
                    { 
                        error: "WhatsApp token expired. Please reconnect in Settings.",
                        code: "TOKEN_EXPIRED"
                    },
                    { status: 401 }
                );
            }

            if (configError.message?.includes("not configured")) {
                return NextResponse.json(
                    { 
                        error: "WhatsApp not configured. Please connect your account in Settings.",
                        code: "NOT_CONFIGURED"
                    },
                    { status: 400 }
                );
            }

            throw configError;
        }

        // Build message payload
        const cleanTo = to.replace(/\D/g, "");
        const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

        const payload: any = {
            messaging_product: "whatsapp",
            to: cleanTo,
            type: type
        };

        if (type === "template") {
            payload.template = {
                name: templateName,
                language: { code: languageCode || "en_US" },
                components: components || []
            };
        } else if (type === "text") {
            payload.text = { body: text };
        }

        console.log(`[${requestId}] Sending to Meta API`);

        // Send to Meta
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log(`[${requestId}] Meta response:`, { status: response.status });

        if (!response.ok) {
            console.error(`[${requestId}] Meta error:`, data.error);
            
            // Handle token expiration from Meta API
            if (response.status === 401 || data.error?.code === 190) {
                return NextResponse.json(
                    { 
                        error: "WhatsApp token expired. Please reconnect in Settings.",
                        code: "TOKEN_EXPIRED"
                    },
                    { status: 401 }
                );
            }

            return NextResponse.json(
                { error: data.error?.message || "Failed to send message" },
                { status: response.status }
            );
        }

        console.log(`[${requestId}] Message sent successfully`);
        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error(`[${requestId}] Error:`, error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
