
const TOKEN = "EAALlcr5AuWYBQaCe9sM2jWzaZAZAMrLvQ8Eq5cuhkI94AkBJyHZAaRGjL43XvZCLiYMdsvOPjuFINJa3ioOVmNZAihYmKhFd0if4haijIdKhr2khZAELfZBL4ZCFV7xu3AbUUa58u2i5tKRr1JeZCrKAFz144v85xNC11GZCYpZCVnZB9DOOpUwfPgiJPEY9lr1y0cYmeAZDZD";
const PHONE_ID = "25425371247051012";

async function run() {
    const url = `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`;
    const payload = {
        messaging_product: "whatsapp",
        to: "1234567890", // dummy
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
        console.log("Send Message Result:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
