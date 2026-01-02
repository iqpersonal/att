import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * GOOGLE LEAD ADS WEBHOOK
 * -----------------------
 * This endpoint receives leads from Google Ads (YouTube).
 * Documentation: https://developers.google.com/google-ads/api/docs/reporting/lead-form-extensions
 */

// Helper to send auto-ack (Reusing logic similar to Meta)
async function sendAutoAck(phone: string, name: string) {
    console.log(`[Google-AutoAck] Attempting auto-ack for ${name} (${phone})`);

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
        console.warn(`[Google-AutoAck] Missing WhatsApp credentials in .env.local`);
        return;
    }

    // Default template name
    const templateName = "leadsreply"; // The one we found in your account
    const cleanPhone = phone.replace(/\D/g, "");

    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    const payload = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
            name: templateName,
            language: { code: "en_US" }
        }
    };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.messages) {
            console.log(`[Google-AutoAck] Success for ${phone}`);
        } else {
            console.error(`[Google-AutoAck] Meta Error:`, data.error?.message);
        }
    } catch (err) {
        console.error(`[Google-AutoAck] Fatal Error:`, err);
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { google_key, user_column_data, lead_id, form_id, campaign_id, api_version } = body;

        // 1. Security Check
        const WEBHOOK_KEY = process.env.GOOGLE_ADS_WEBHOOK_KEY || "studioschool_google_key";
        if (google_key !== WEBHOOK_KEY) {
            console.warn("[Google Webhook] Unauthorized access attempt with key:", google_key);
            return new NextResponse("Unauthorized", { status: 401 });
        }

        console.log("[Google Webhook] Received Lead:", lead_id);

        // 2. Parse Google's Data Format
        // Google sends data as an array of objects: [{column_name: "FULL_NAME", string_value: "John"}, ...]
        const getValue = (columnId: string) => {
            const found = user_column_data.find((c: any) => c.column_id === columnId || c.column_name === columnId);
            return found?.string_value || "";
        };

        const fullName = getValue("FULL_NAME") || getValue("Full Name") || "YouTube Lead";
        const email = getValue("EMAIL") || getValue("Email");
        const phone = getValue("PHONE_NUMBER") || getValue("Phone Number");

        // 3. Save to Firestore
        const adminDb = getAdminDb();
        const leadDocRef = await adminDb.collection("leads").add({
            fullName,
            email,
            phone,
            source: "YouTube",
            status: "new",
            googleLeadId: lead_id,
            formId: form_id || null,
            campaignId: campaign_id || null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            notes: `Auto-ingested from YouTube Lead Form. Version: ${api_version}`
        });

        // 4. Log creation to Activities
        await leadDocRef.collection("activities").add({
            type: "creation",
            content: `Lead auto-ingested via YouTube Webhook`,
            createdAt: FieldValue.serverTimestamp()
        });

        // 5. Trigger Auto-Acknowledgment
        if (phone) {
            await sendAutoAck(phone, fullName);
        }

        return NextResponse.json({ success: true, leadId: leadDocRef.id });

    } catch (error: any) {
        console.error("[Google Webhook] Fatal Error:", error);
        return new NextResponse(`Error: ${error.message}`, { status: 500 });
    }
}
