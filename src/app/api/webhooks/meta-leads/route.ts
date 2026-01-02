import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

// Helper to find tenant by page ID using Admin SDK
async function findTenantByPageId(pageId: string) {
    console.log(`[Webhook] Searching for tenant with Page ID: ${pageId}`);
    const adminDb = getAdminDb();
    const snapshot = await adminDb.collection("tenants").get();

    for (const tenantDoc of snapshot.docs) {
        const integrationRef = adminDb.doc(`tenants/${tenantDoc.id}/integrations/meta`);
        const integrationSnap = await integrationRef.get();

        if (integrationSnap.exists && integrationSnap.data()?.pageId === pageId) {
            return { tenantId: tenantDoc.id, config: integrationSnap.data() };
        }
    }
    return null;
}

// Helper to find tenant by WABA ID
async function findTenantByWabaId(wabaId: string) {
    console.log(`[Webhook] Searching for tenant with WABA ID: ${wabaId}`);
    const adminDb = getAdminDb();
    const snapshot = await adminDb.collection("tenants").get();

    for (const tenantDoc of snapshot.docs) {
        const configRef = adminDb.doc(`tenants/${tenantDoc.id}/config/whatsapp`);
        const configSnap = await configRef.get();

        if (configSnap.exists && configSnap.data()?.wabaId === wabaId) {
            return { tenantId: tenantDoc.id, config: configSnap.data() };
        }
    }
    return null;
}

// Helper to send auto-ack
async function sendAutoAck(tenantId: string, leadId: string, phone: string, name: string, accessToken: string, config: any) {
    if (!config.whatsappAutoAck) return;

    console.log(`[AutoAck] Attempting auto-ack for ${name} (${phone}) for lead ${leadId}`);

    const adminDb = getAdminDb();
    const whatsappSnap = await adminDb.doc(`tenants/${tenantId}/config/whatsapp`).get();
    const whatsappData = whatsappSnap.data() || {};

    const phoneNumberId = whatsappData.phoneNumberId;
    const whatsappAccessToken = whatsappData.accessToken || accessToken; // Prioritize dedicated WhatsApp token

    if (!phoneNumberId || !whatsappAccessToken) {
        console.warn(`[AutoAck] Missing credentials for tenant ${tenantId}. PhoneID: ${!!phoneNumberId}, Token: ${!!whatsappAccessToken}`);
        return;
    }

    const templateName = config.whatsappAckTemplate || "lead_acknowledgment";
    const cleanPhone = phone.replace(/\D/g, "");

    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    const payload = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
            name: templateName,
            language: { code: "en_US" },
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: name }
                    ]
                }
            ]
        }
    };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${whatsappAccessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.messages && data.messages.length > 0) {
            console.log(`[AutoAck] Success for ${phone}`);

            // 1. Log to generic message history
            await adminDb.collection("tenants").doc(tenantId).collection("message_history").add({
                toName: name,
                toNumber: cleanPhone,
                message: `Auto-Ack Template: ${templateName}`,
                template: templateName,
                status: 'sent',
                createdAt: FieldValue.serverTimestamp()
            });

            // 2. Log to the specific Lead's Interaction Hub (Phase 2 feature)
            await adminDb.doc(`leads/${leadId}`).collection("activities").add({
                type: "whatsapp",
                content: `Automated "Welcome" WhatsApp sent via Meta Webhook (Template: ${templateName})`,
                createdAt: FieldValue.serverTimestamp(),
                userId: "system_automation"
            });
        } else if (data.error) {
            console.error(`[AutoAck] Meta Error:`, data.error.message);
        }
    } catch (err) {
        console.error(`[AutoAck] Fatal Error:`, err);
    }
}


// 1. Verification (GET)
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "studioschool_meta_verify_token";

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("[Webhook] Meta Webhook Verified Successfully");
        // Return only the challenge string as plain text
        return new Response(challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    console.warn("[Webhook] Meta Verification Failed: Invalid Token");
    return new Response("Forbidden", { status: 403 });
}

// 2. Ingestion (POST)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log("[Webhook] Received Event:", JSON.stringify(body, null, 2));

        if (body.object === "page") {
            // ... [Keep existing Page Lead handling] ...
            for (const entry of body.entry) {
                const pageId = entry.id;
                const tenantData = await findTenantByPageId(pageId);
                if (!tenantData) continue;
                const { tenantId, config } = tenantData;

                for (const change of entry.changes) {
                    if (change.field === "leadgen") {
                        const leadGenId = change.value.leadgen_id;
                        const formId = change.value.form_id;

                        // NEW: Robust Token Exchange for Webhook
                        // Some detail fetches fail if using a System User token instead of Page Token
                        let effectiveToken = config?.accessToken;
                        try {
                            const pageTokenUrl = `https://graph.facebook.com/v21.0/${pageId}?fields=access_token&access_token=${config?.accessToken}`;
                            const pageTokenRes = await fetch(pageTokenUrl);
                            const pageTokenData = await pageTokenRes.json();
                            if (pageTokenData.access_token) {
                                console.log("[Webhook] Exchanged for Page Access Token.");
                                effectiveToken = pageTokenData.access_token;
                            }
                        } catch (e) {
                            console.warn("[Webhook] Token exchange failed, falling back to original.");
                        }

                        // NEW: Fetch Form Name for consistency
                        let formName = "";
                        if (formId) {
                            try {
                                const formUrl = `https://graph.facebook.com/v21.0/${formId}?fields=name&access_token=${effectiveToken}`;
                                const formRes = await fetch(formUrl);
                                const formData = await formRes.json();
                                formName = formData.name || "";
                            } catch (e) {
                                console.warn("[Webhook] Failed to fetch form name.");
                            }
                        }

                        const graphUrl = `https://graph.facebook.com/v21.0/${leadGenId}?access_token=${effectiveToken}`;
                        const response = await fetch(graphUrl);
                        const leadDetails = await response.json();
                        if (leadDetails.error) {
                            console.error(`[Webhook] Details Error for ${leadGenId}:`, leadDetails.error.message);
                            continue;
                        }

                        const fields = leadDetails.field_data || [];
                        const getValue = (key: string) => {
                            const found = fields.find((f: any) => f.name.toLowerCase().includes(key.toLowerCase()));
                            return found?.values?.[0] || "";
                        };

                        const fullName = getValue("full_name") || getValue("name") || "Meta Lead";
                        const email = getValue("email") || "";
                        const phone = getValue("phone") || "";

                        const adminDb = getAdminDb();
                        const leadDocRef = await adminDb.collection("leads").add({
                            tenantId,
                            fullName,
                            email,
                            phone,
                            source: "Facebook/Instagram",
                            status: "new",
                            metaLeadId: leadGenId,
                            formId: formId || null,
                            formName, // Save form name
                            adId: change.value.ad_id || null,
                            createdAt: FieldValue.serverTimestamp(),
                            updatedAt: FieldValue.serverTimestamp(),
                            notes: `Auto-ingested from Meta Lead Form${formName ? `: ${formName}` : ""}.`
                        });

                        // Log creation to Interaction Hub
                        await leadDocRef.collection("activities").add({
                            type: "creation",
                            content: `Lead auto-ingested via Meta Webhook (Form: ${formName || 'Unknown'})`,
                            createdAt: FieldValue.serverTimestamp()
                        });

                        // 4. Trigger Auto-Acknowledgment
                        if (phone) {
                            await sendAutoAck(tenantId, leadDocRef.id, phone, fullName, effectiveToken, config);
                        }
                    }
                }
            }
            return new NextResponse("EVENT_RECEIVED", { status: 200 });
        }

        // 2. Handle WhatsApp Business Account Events
        if (body.object === "whatsapp_business_account") {
            for (const entry of body.entry) {
                const wabaId = entry.id;
                const tenantData = await findTenantByWabaId(wabaId);
                if (!tenantData) {
                    console.warn(`[Webhook] No tenant found for WABA ID: ${wabaId}`);
                    continue;
                }

                const { tenantId } = tenantData;
                const adminDb = getAdminDb();

                for (const change of entry.changes) {
                    const value = change.value;

                    // A. Handle Incoming Messages
                    if (value.messages) {
                        for (const message of value.messages) {
                            const senderPhone = message.from;
                            const contact = value.contacts?.find((c: any) => c.wa_id === senderPhone);
                            const senderName = contact?.profile?.name || "WhatsApp User";
                            const messageId = message.id;
                            const text = message.text?.body || "";

                            console.log(`[Webhook] New Message from ${senderPhone}: ${text}`);

                            const convoId = `${tenantId}_${senderPhone}`;
                            const convoRef = adminDb.doc(`tenants/${tenantId}/conversations/${convoId}`);

                            // Update Conversation Metadata
                            await convoRef.set({
                                lastMessage: text,
                                lastContactTime: FieldValue.serverTimestamp(),
                                contactName: senderName,
                                contactPhone: senderPhone,
                                unreadCount: FieldValue.increment(1),
                                tenantId,
                                updatedAt: FieldValue.serverTimestamp()
                            }, { merge: true });

                            // Add to history
                            await convoRef.collection("messages").add({
                                text,
                                type: 'inbound',
                                metaId: messageId,
                                timestamp: FieldValue.serverTimestamp()
                            });
                        }
                    }

                    // B. Handle Message Status Updates (Sent, Delivered, Read)
                    if (value.statuses) {
                        for (const status of value.statuses) {
                            const messageId = status.id;
                            const deliveryStatus = status.status; // 'delivered', 'read', 'sent'
                            const recipientPhone = status.recipient_id;

                            const convoId = `${tenantId}_${recipientPhone}`;
                            const messagesRef = adminDb.collection(`tenants/${tenantId}/conversations/${convoId}/messages`);

                            // Find the message by its Meta ID and update status
                            const q = await messagesRef.where("metaId", "==", messageId).limit(1).get();
                            if (!q.empty) {
                                await q.docs[0].ref.update({
                                    status: deliveryStatus,
                                    statusUpdatedAt: FieldValue.serverTimestamp()
                                });
                            }
                        }
                    }
                }
            }
            return new NextResponse("EVENT_RECEIVED", { status: 200 });
        }

        return new NextResponse("NOT_SUPPORTED_OBJECT", { status: 404 });
    } catch (error: any) {
        console.error("[Webhook] Fatal Error:", error);
        return new NextResponse(`Error: ${error.message}`, { status: 500 });
    }
}
