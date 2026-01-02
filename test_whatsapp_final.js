
const TOKEN = "EAALlcr5AuWYBQaCe9sM2jWzaZAZAMrLvQ8Eq5cuhkI94AkBJyHZAaRGjL43XvZCLiYMdsvOPjuFINJa3ioOVmNZAihYmKhFd0if4haijIdKhr2khZAELfZBL4ZCFV7xu3AbUUa58u2i5tKRr1JeZCrKAFz144v85xNC11GZCYpZCVnZB9DOOpUwfPgiJPEY9lr1y0cYmeAZDZD";
const PHONE_NUMBER_ID = "786617204538778";

async function sendTestMessage() {
    console.log("--- Sending WhatsApp Test Message ---");
    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

    // Using the 'hello_world' template which is available in all test accounts
    const payload = {
        messaging_product: "whatsapp",
        to: "919446890860", // Your number from the screenshot
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
            console.log("\n❌ FAILED: Check the error above.");
        }
    } catch (err) {
        console.error("Fatal Error:", err);
    }
}

sendTestMessage();
