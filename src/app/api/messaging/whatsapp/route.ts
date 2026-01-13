import { NextResponse } from "next/server";
import { getBestWhatsAppToken, getPhoneNumberIdFromEnv } from "@/lib/envTokenManager";

console.log("[WhatsApp API] Route loaded");

export async function POST(req: Request) {
    const requestId = Date.now();
    console.log(`[${requestId}] WhatsApp request started`);
    
    try {
        let body = await req.json();
        console.log(`[${requestId}] Body parsed:`, { to: body.to, type: body.type });

        const { to, templateName, components, languageCode, text, type = "template" } = body;

        let accessToken: string;
        let phoneNumberId: string;
        let tokenSource: string;

        try {
            // Get token from environment (.env) - MOST RELIABLE
            const { token, source } = getBestWhatsAppToken();
            accessToken = token;
            tokenSource = source;
            
            console.log(`[${requestId}] Token source: ${tokenSource}`);

            // Get phone number ID from environment
            phoneNumberId = getPhoneNumberIdFromEnv();
            
            console.log(`[${requestId}] Configuration loaded from environment`);
            console.log(`[${requestId}] Using Phone Number ID: ${phoneNumberId}`);

        } catch (configError: any) {
            console.error(`[${requestId}] Configuration error:`, configError.message);
            return NextResponse.json(
                { 
                    error: "WhatsApp configuration incomplete. Please check environment variables.",
                    details: configError.message
                },
                { status: 500 }
            );
        }

        // Build message payload
        const cleanTo = to.replace(/\D/g, "");
        const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

        console.log(`[${requestId}] Sending to URL: ${url}`);

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

        console.log(`[${requestId}] Sending to Meta API with ${tokenSource}`);

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
        console.log(`[${requestId}] Meta response status: ${response.status}`);

        if (!response.ok) {
            console.error(`[${requestId}] Meta error:`, data.error);
            
            // Handle specific errors
            if (response.status === 401) {
                return NextResponse.json(
                    { 
                        error: "WhatsApp token invalid or expired. Please check META_SYSTEM_USER_TOKEN in environment.",
                        code: "TOKEN_INVALID"
                    },
                    { status: 401 }
                );
            }

            if (response.status === 400 && data.error?.code === 100) {
                return NextResponse.json(
                    { 
                        error: `Invalid Phone Number ID (${phoneNumberId}). Please verify WHATSAPP_PHONE_NUMBER_ID in environment.`,
                        code: "INVALID_PHONE_ID",
                        details: data.error.message
                    },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { 
                    error: data.error?.message || "Failed to send message",
                    code: data.error?.code,
                    details: data.error
                },
                { status: response.status }
            );
        }

        console.log(`[${requestId}] Message sent successfully`);
        return NextResponse.json({ success: true, data, tokenSource });

    } catch (error) {
        console.error(`[${requestId}] Unexpected error:`, error);
        return NextResponse.json(
            { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
