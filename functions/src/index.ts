import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Webhook: Receive incoming WhatsApp messages
export const whatsappWebhook = functions.https.onRequest(async (req: any, res: any) => {
  // Handle GET request for webhook verification
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log(`[Webhook] GET - Mode: ${mode}, Token: ${token}`);

    if (mode === "subscribe" && token === "whatsapp_verify_token_123") {
      console.log("[Webhook] Verified!");
      res.set("Access-Control-Allow-Origin", "*").status(200).send(String(challenge));
      return;
    }

    console.log("[Webhook] Verification failed!");
    res.set("Access-Control-Allow-Origin", "*").status(403).json({ error: "Unauthorized" });
    return;
  }

  // Handle POST request for incoming messages
  if (req.method === "POST") {
    try {
      const body = req.body;
      console.log("[Webhook] Received POST:", JSON.stringify(body));

      if (body.object !== "whatsapp_business_account") {
        res.set("Access-Control-Allow-Origin", "*").status(200).json({ success: true });
        return;
      }

      if (!body.entry || body.entry.length === 0) {
        res.set("Access-Control-Allow-Origin", "*").status(200).json({ success: true });
        return;
      }

      // Find tenant by WABA ID
      for (const entry of body.entry) {
        const wabaId = entry.id;
        const changes = entry.changes || [];

        console.log(`[Webhook] Processing WABA: ${wabaId}, Changes: ${changes.length}`);

        // Find tenant by WABA ID
        const tenantsSnap = await db.collection("tenants").get();
        let tenantId: string | null = null;

        for (const tenantDoc of tenantsSnap.docs) {
          const configSnap = await tenantDoc.ref.collection("config").doc("whatsapp").get();
          if (configSnap.exists && configSnap.data()?.wabaId === wabaId) {
            tenantId = tenantDoc.id;
            break;
          }
        }

        if (!tenantId) {
          console.warn(`[Webhook] No tenant found for WABA: ${wabaId}`);
          continue;
        }

        console.log(`[Webhook] Matched Tenant: ${tenantId}`);

        // Process changes
        for (const change of changes) {
          if (change.field !== "messages") continue;

          const messages = change.value?.messages || [];
          const contacts = change.value?.contacts || [];

          console.log(`[Webhook] Processing ${messages.length} messages`);

          // Handle incoming messages
          for (const message of messages) {
            if (message.type === "text") {
              const fromNumber = message.from;
              const messageText = message.text?.body || "";
              const timestamp = parseInt(message.timestamp) * 1000;
              const contact = contacts.find((c: any) => c.wa_id === fromNumber);
              const senderName = contact?.profile?.name || fromNumber;

              console.log(`[Webhook] Message from ${senderName} (${fromNumber}): ${messageText}`);

              // Get or create conversation
              const convRef = db.collection("tenants").doc(tenantId).collection("conversations");
              const existing = await convRef.where("participantPhone", "==", fromNumber).get();

              let conversationId: string;
              if (existing.empty) {
                const newConv = await convRef.add({
                  participantName: senderName,
                  participantPhone: fromNumber,
                  linkedId: null,
                  linkedType: "lead",
                  lastMessage: messageText,
                  lastMessageTime: new Date(timestamp),
                  messageCount: 1,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  source: "whatsapp",
                });
                conversationId = newConv.id;
              } else {
                conversationId = existing.docs[0].id;
                await existing.docs[0].ref.update({
                  lastMessage: messageText,
                  lastMessageTime: new Date(timestamp),
                  messageCount: admin.firestore.FieldValue.increment(1),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
              }

              // Save message
              await db
                .collection("tenants")
                .doc(tenantId)
                .collection("conversations")
                .doc(conversationId)
                .collection("messages")
                .add({
                  senderId: fromNumber,
                  senderName,
                  message: messageText,
                  type: "received",
                  status: "delivered",
                  timestamp: new Date(timestamp),
                  metaMessageId: message.id,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });

              console.log(`[Webhook] Message saved to conversation ${conversationId}`);
            }
          }
        }
      }

      res.set("Access-Control-Allow-Origin", "*").status(200).json({ success: true });
      return;
    } catch (error) {
      console.error("[Webhook] Error:", error);
      res.set("Access-Control-Allow-Origin", "*").status(500).json({ success: false, error: String(error) });
      return;
    }
  }

  res.set("Access-Control-Allow-Origin", "*").status(405).json({ error: "Method not allowed" });
});

// Trigger: Send welcome message when new lead is created
export const sendLeadWelcomeMessage = functions.firestore
  .document("tenants/{tenantId}/leads/{leadId}")
  .onCreate(async (snap, context) => {
    const { tenantId, leadId } = context.params;
    const leadData = snap.data();

    try {
      const tenantConfig = await db.doc(`tenants/${tenantId}/config/whatsapp`).get();
      const wabaConfig = tenantConfig.data();

      if (!wabaConfig?.accessToken || !wabaConfig?.wabaId) {
        console.log(`[LeadTrigger] WhatsApp not configured for tenant ${tenantId}`);
        return;
      }

      const leadPhone = leadData?.phone || leadData?.phoneNumber;

      if (!leadPhone) {
        console.log(`[LeadTrigger] No phone found for lead ${leadId}`);
        return;
      }

      const phoneNumberId = wabaConfig.phoneNumberId;
      const accessToken = wabaConfig.accessToken;
      const cleanPhone = leadPhone.replace(/\D/g, "");

      const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "template",
          template: {
            name: "leadsreply",
            language: { code: "en_US" },
          },
        }),
      });

      const result = await response.json();
      if (result.messages) {
        await db.doc(`tenants/${tenantId}/leads/${leadId}`).update({
          messageSent: true,
          metaMessageId: result.messages[0].id,
          messageTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`[LeadTrigger] Message sent to ${leadPhone}`);
      }
    } catch (error) {
      console.error(`[LeadTrigger] Error:`, error);
    }
  });
