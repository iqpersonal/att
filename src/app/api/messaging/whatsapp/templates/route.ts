export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getBestWhatsAppToken } from "@/lib/envTokenManager";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const tenantId = searchParams.get("tenantId") || "tellus-teams";

        // Get token and WABA ID from environment (most reliable source)
        let accessToken: string;
        let wabaId: string;
        let tokenSource: string;

        try {
            const { token, source } = getBestWhatsAppToken();
            accessToken = token;
            tokenSource = source;
            
            wabaId = process.env.WHATSAPP_WABA_ID || "";

            if (!wabaId) {
                throw new Error("WHATSAPP_WABA_ID not found in environment");
            }

            console.log(`[Templates] Using token source: ${tokenSource}`);
            console.log(`[Templates] WABA ID: ${wabaId}`);

        } catch (error: any) {
            console.error(`[Templates] Configuration error:`, error.message);
            return NextResponse.json({
                success: false,
                error: `WhatsApp configuration error: ${error.message}`,
                code: "CONFIG_ERROR"
            }, { status: 500 });
        }

        const url = `https://graph.facebook.com/v21.0/${wabaId}/message_templates?limit=100`;
        console.log(`[Templates] Fetching from: ${url}`);

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
            } catch (parseError) {
                console.error("[Templates] Meta Non-JSON Response:", responseText);
                return NextResponse.json({ 
                    success: false, 
                    error: "Invalid response from Meta API",
                    details: responseText
                }, { status: 500 });
            }

            if (!response.ok) {
                console.error("[Templates] Meta API error:", responseData);
                
                if (response.status === 401) {
                    return NextResponse.json({
                        success: false,
                        error: "Invalid WhatsApp token. Please verify META_SYSTEM_USER_TOKEN.",
                        code: "TOKEN_INVALID"
                    }, { status: 401 });
                }

                return NextResponse.json({
                    success: false,
                    error: responseData.error?.message || "Failed to fetch templates",
                    code: responseData.error?.code
                }, { status: response.status });
            }

            console.log(`[Templates] Successfully fetched templates`);

            return NextResponse.json({
                success: true,
                templates: responseData.data || [],
                tokenSource
            });

        } catch (fetchError) {
            console.error("[Templates] Fetch error:", fetchError);
            return NextResponse.json({
                success: false,
                error: "Failed to fetch templates from Meta API",
                details: fetchError instanceof Error ? fetchError.message : String(fetchError)
            }, { status: 500 });
        }

    } catch (error) {
        console.error("[Templates] Unexpected error:", error);
        return NextResponse.json({
            success: false,
            error: "Internal server error",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

