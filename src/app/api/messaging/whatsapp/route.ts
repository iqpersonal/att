import { NextResponse } from "next/server";

// Direct environment access - no Firebase dependency
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

console.log("[WhatsApp] Route loaded. Env check:", {
  hasToken: !!WHATSAPP_ACCESS_TOKEN,
  hasPhoneId: !!WHATSAPP_PHONE_NUMBER_ID,
  tokenLength: WHATSAPP_ACCESS_TOKEN?.length || 0
});

export async function POST(req: Request) {
    const requestId = Date.now();
    console.log(`[${requestId}] WhatsApp request started`);
    
    try {
        let body;
        try {
            body = await req.json();
            console.log(`[${requestId}] Body parsed:`, { to: body.to, type: body.type });
        } catch (e) {
            console.error(`[${requestId}] JSON parse error:`, e);
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const { to, templateName, components, languageCode, text, type = "template" } = body;

        let accessToken = WHATSAPP_ACCESS_TOKEN;
        let phoneNumberId = WHATSAPP_PHONE_NUMBER_ID;

        console.log(`[${requestId}] Credentials:`, {
          hasToken: !!accessToken,
          hasPhoneId: !!phoneNumberId
        });

        if (!accessToken || !phoneNumberId) {
            console.error(`[${requestId}] Missing credentials!`);
            return NextResponse.json(
                { error: "WhatsApp credentials not configured" },
                { status: 400 }
            );
        }

        const cleanTo = to.replace(/\D/g, "");
        const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

        console.log(`[${requestId}] Sending to Meta:`, { url, to: cleanTo });

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

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        console.log(`[${requestId}] Meta response:`, { 
            status: response.status, 
            messageId: data.messages?.[0]?.id,
            error: data.error?.message 
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: data.error?.message || "Failed to send message" },
                { status: response.status }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error(`[${requestId}] Error:`, error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
