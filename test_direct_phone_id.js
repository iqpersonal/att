
const TOKEN = "EAALlcr5AuWYBQTW9PKuYkwPBxGx6hg2sxPBoUesWq1CS5zcMawQZCBXbQXivaTQA364V43SBqzoqsnZCcYe0ZC2q26nmXWVT4Kwkm020ZAqfltXgaxNZAa8cgCilKCUcz1zlST0W8wYpzHrWaUyJcymzZApz452RX4Jan5rpllmZAiaT13UsSbo3J3OjgKLeUGUgnxPKWDv1wTdERIzpQKYxK10xhM2KtuMyEZA7L7gI8IMmgrhOELZBq8DdyZB57BEB2NstBjEMbDz0dZCjsvcp2lZB7gZDZD";
const PHONE_ID = "786617204538778";

async function run() {
    try {
        console.log(`Checking Phone ID ${PHONE_ID}...`);
        const res = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}?fields=id,display_phone_number,status,quality_rating&access_token=${TOKEN}`);
        const data = await res.json();
        console.log("Phone Info:", JSON.stringify(data, null, 2));

        console.log("\nAttempting to Send with fixed payload...");
        const sendUrl = `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`;
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: "919446890860",
            type: "template",
            template: {
                name: "hello_world",
                language: { code: "en_US" }
            }
        };

        const sRes = await fetch(sendUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        const sData = await sRes.json();
        console.log("Send Result:", JSON.stringify(sData, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
