import { NextResponse, NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

// Webhook verification token - Store in .env.local
const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_TOKEN || "whatsapp_verify_token_123";

// Helper to find tenant by WABA ID
async function findTenantByWabaId(wabaId: string) {
    console.log(`[WhatsApp Webhook] Searching for tenant with WABA ID: ${wabaId}`);
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

// Verify webhook subscription with Meta
export async function GET(req: NextRequest) {
    console.log("[WhatsApp Webhook] GET request received for verification");
    
    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    console.log(`[WhatsApp Webhook] Mode: ${mode}, Token Match: ${token === WEBHOOK_VERIFY_TOKEN}`);

    if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
        console.log("[WhatsApp Webhook] Webhook verified successfully!");
        return new NextResponse(challenge, { status: 200 });
    }

    console.warn("[WhatsApp Webhook] Webhook verification failed - invalid token");
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

// Handle incoming messages from Meta WhatsApp API
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log("[WhatsApp Webhook] Received webhook:", JSON.stringify(body, null, 2));

        // Meta sends updates in entry array
        if (body.object !== "whatsapp_business_account") {
            console.log("[WhatsApp Webhook] Ignoring non-WhatsApp event");
            return NextResponse.json({ success: false }, { status: 400 });
        }

        if (!body.entry || body.entry.length === 0) {
            return NextResponse.json({ success: true }, { status: 200 });
        }

        const adminDb = getAdminDb();

        // Process each entry
        for (const entry of body.entry) {
            const wabaId = entry.id; // WABA ID from Meta
            const changes = entry.changes || [];

            console.log(`[WhatsApp Webhook] Processing WABA: ${wabaId}, Changes: ${changes.length}`);

            // Find tenant by WABA ID
            const tenantInfo = await findTenantByWabaId(wabaId);
            if (!tenantInfo) {
                console.warn(`[WhatsApp Webhook] No tenant found for WABA ID: ${wabaId}`);
                continue;
            }

            const { tenantId } = tenantInfo;
            console.log(`[WhatsApp Webhook] Matched Tenant: ${tenantId}`);

            // Process each change
            for (const change of changes) {
                if (change.field !== "messages") {
                    continue; // We only care about messages
                }

                const messages = change.value?.messages || [];
                const contacts = change.value?.contacts || [];
                const statuses = change.value?.statuses || [];

                console.log(`[WhatsApp Webhook] Messages: ${messages.length}, Statuses: ${statuses.length}`);

                // Handle incoming messages
                for (const message of messages) {
                    if (message.type === "text") {
                        const fromNumber = message.from;
                        const messageText = message.text?.body || "";
                        const timestamp = parseInt(message.timestamp) * 1000;
                        const contact = contacts.find((c: any) => c.wa_id === fromNumber);
                        const senderName = contact?.profile?.name || fromNumber;

                        console.log(`[WhatsApp Webhook] Text message from ${senderName} (${fromNumber}): "${messageText}"`);

                        // Try to find or create conversation
                        const conversationsRef = adminDb.collection("tenants").doc(tenantId).collection("conversations");
                        const q = conversationsRef.where("participantPhone", "==", fromNumber);
                        const snapshot = await q.get();

                        let conversationId: string;
                        let studentId: string | null = null;

                        if (snapshot.empty) {
                            console.log(`[WhatsApp Webhook] Creating new conversation for ${fromNumber}`);

                            // Try to find associated lead or student
                            const leadsSnapshot = await adminDb
                                .collection("tenants")
                                .doc(tenantId)
                                .collection("leads")
                                .where("phone", "==", fromNumber)
                                .get();

                            const studentsSnapshot = await adminDb
                                .collection("tenants")
                                .doc(tenantId)
                                .collection("students")
                                .where("phone", "==", fromNumber)
                                .get();

                            let linkedId = null;
                            let linkedType = "lead";

                            if (!leadsSnapshot.empty) {
                                linkedId = leadsSnapshot.docs[0].id;
                                linkedType = "lead";
                            } else if (!studentsSnapshot.empty) {
                                linkedId = studentsSnapshot.docs[0].id;
                                linkedType = "student";
                                studentId = linkedId;
                            }

                            // Create new conversation
                            const convRef = await conversationsRef.add({
                                participantName: senderName,
                                participantPhone: fromNumber,
                                linkedId,
                                linkedType,
                                lastMessage: messageText,
                                lastMessageTime: new Date(timestamp),
                                messageCount: 1,
                                createdAt: FieldValue.serverTimestamp(),
                                updatedAt: FieldValue.serverTimestamp(),
                                source: "whatsapp"
                            });
                            conversationId = convRef.id;
                        } else {
                            conversationId = snapshot.docs[0].id;
                            studentId = snapshot.docs[0].data().studentId || null;
                            
                            // Update conversation last message
                            await snapshot.docs[0].ref.update({
                                lastMessage: messageText,
                                lastMessageTime: new Date(timestamp),
                                messageCount: FieldValue.increment(1),
                                updatedAt: FieldValue.serverTimestamp()
                            });
                        }

                        // Save individual message
                        await adminDb
                            .collection("tenants")
                            .doc(tenantId)
                            .collection("conversations")
                            .doc(conversationId)
                            .collection("messages")
                            .add({
                                senderId: fromNumber,
                                senderName,
                                text: messageText,
                                type: "inbound",
                                status: "delivered",
                                timestamp: new Date(timestamp),
                                metaMessageId: message.id,
                                createdAt: FieldValue.serverTimestamp()
                            });

                        console.log(`[WhatsApp Webhook] Message saved to conversation ${conversationId}`);
                    }
                }

                // Handle message delivery/read status
                for (const status of statuses) {
                    console.log(`[WhatsApp Webhook] Status update for message ${status.id}: ${status.status}`);
                    
                    // Find and update message status
                    const conversationsRef = adminDb.collection("tenants").doc(tenantId).collection("conversations");
                    const allConvs = await conversationsRef.get();

                    for (const convDoc of allConvs.docs) {
                        const messagesRef = convDoc.ref.collection("messages");
                        const msgSnapshot = await messagesRef.where("metaMessageId", "==", status.id).get();

                        if (!msgSnapshot.empty) {
                            await msgSnapshot.docs[0].ref.update({
                                status: status.status // "sent" | "delivered" | "read"
                            });
                            console.log(`[WhatsApp Webhook] Updated message ${status.id} status to ${status.status}`);
                            break;
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("[WhatsApp Webhook] Error processing webhook:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}




