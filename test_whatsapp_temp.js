
const TOKEN = "EAALlcr5AuWYBQTW9PKuYkwPBxGx6hg2sxPBoUesWq1CS5zcMawQZCBXbQXivaTQA364V43SBqzoqsnZCcYe0ZC2q26nmXWVT4Kwkm020ZAqfltXgaxNZAa8cgCilKCUcz1zlST0W8wYpzHrWaUyJcymzZApz452RX4Jan5rpllmZAiaT13UsSbo3J3OjgKLeUGUgnxPKWDv1wTdERIzpQKYxK10xhM2KtuMyEZA7L7gI8IMmgrhOELZBq8DdyZB57BEB2NstBjEMbDz0dZCjsvcp2lZB7gZDZD";
const PHONE_NUMBER_ID = "786617204538778";

async function sendTestMessage() {
    console.log("--- Sending WhatsApp Test Message (Temporary Token) ---");
    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

    const payload = {
        messaging_product: "whatsapp",
        to: "919446890860",
        type: "template",
        template: {
            name: "hello_world",
            language: { code: "en_US" }
        }
    };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log("Response:", JSON.stringify(data, null, 2));

        if (data.messages && data.messages.length > 0) {
            console.log("\n✅ SUCCESS: Message sent successfully!");
        } else {
            console.log("\n❌ FAILED: Check the error message in the Response object.");
        }
    } catch (err) {
        console.error("Fatal Error:", err);
    }
}

sendTestMessage();
