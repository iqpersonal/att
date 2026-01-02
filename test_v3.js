
const TOKEN = "EAALlcr5AuWYBQTW9PKuYkwPBxGx6hg2sxPBoUesWq1CS5zcMawQZCBXbQXivaTQA364V43SBqzoqsnZCcYe0ZC2q26nmXWVT4Kwkm020ZAqfltXgaxNZAa8cgCilKCUcz1zlST0W8wYpzHrWaUyJcymzZApz452RX4Jan5rpllmZAiaT13UsSbo3J3OjgKLeUGUgnxPKWDv1wTdERIzpQKYxK10xhM2KtuMyEZA7L7gI8IMmgrhOELZBq8DdyZB57BEB2NstBjEMbDz0dZCjsvcp2lZB7gZDZD";
const PHONE_ID = "786617204538778";

async function run() {
    try {
        console.log("\nAttempting to Send Text Message (Version 3 - JSON Header Check)...");
        const sendUrl = `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`;

        const payload = JSON.stringify({
            messaging_product: "whatsapp",
            to: "919446890860", // Removed spaces
            type: "text",
            text: { body: "test message" }
        });

        const sRes = await fetch(sendUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${TOKEN}`,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: payload
        });
        const sData = await sRes.json();
        console.log("Send Result:", JSON.stringify(sData, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
