import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Sends an email using the Firebase "Trigger Email" extension.
 * This function adds a document to the 'mail' collection in Firestore.
 */
export async function sendEmail(to: string | string[], subject: string, html: string) {
    try {
        const mailRef = collection(db, "mail");
        await addDoc(mailRef, {
            to: Array.isArray(to) ? to : [to],
            message: {
                subject: subject,
                html: html,
            },
            sentAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error("Error sending email via Firestore:", error);
        return { success: false, error };
    }
}

/**
 * Sends a WhatsApp message using the Meta Cloud API via an internal proxy.
 */
export async function sendWhatsApp(to: string, templateName: string, components: any[] = [], tenantId?: string, languageCode?: string) {
    try {
        const response = await fetch("/api/messaging/whatsapp", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                to,
                templateName,
                components,
                tenantId,
                languageCode,
            }),
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error sending WhatsApp message:", error);
        return { success: false, error: "Failed to connect to WhatsApp service" };
    }
}
/**
 * Sends a free-text WhatsApp message (only works if 24h window is open).
 */
export async function sendWhatsAppFreeText(to: string, text: string, tenantId: string) {
    try {
        const response = await fetch("/api/messaging/whatsapp", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                to,
                text,
                type: "text",
                tenantId,
            }),
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error sending free-text WhatsApp:", error);
        return { success: false, error: "Failed to connect to WhatsApp service" };
    }
}
