
const TOKEN = "EAALlcr5AuWYBQaCe9sM2jWzaZAZAMrLvQ8Eq5cuhkI94AkBJyHZAaRGjL43XvZCLiYMdsvOPjuFINJa3ioOVmNZAihYmKhFd0if4haijIdKhr2khZAELfZBL4ZCFV7xu3AbUUa58u2i5tKRr1JeZCrKAFz144v85xNC11GZCYpZCVnZB9DOOpUwfPgiJPEY9lr1y0cYmeAZDZD";

async function run() {
    try {
        console.log("Checking Asset Access for Token...");
        const res = await fetch(`https://graph.facebook.com/v21.0/debug_token?input_token=${TOKEN}&access_token=${TOKEN}`);
        const data = await res.json();
        console.log("Token Data:", JSON.stringify(data, null, 2));

        console.log("\nAttempting to List Shared WABAs via Business ID (from prev script)...");
        const wabaRes = await fetch(`https://graph.facebook.com/v21.0/1129731335683548/whatsapp_business_accounts?access_token=${TOKEN}`);
        const wabaData = await wabaRes.json();
        console.log("WABA List:", JSON.stringify(wabaData, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
