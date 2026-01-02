
const TOKEN = "EAALlcr5AuWYBQaCe9sM2jWzaZAZAMrLvQ8Eq5cuhkI94AkBJyHZAaRGjL43XvZCLiYMdsvOPjuFINJa3ioOVmNZAihYmKhFd0if4haijIdKhr2khZAELfZBL4ZCFV7xu3AbUUa58u2i5tKRr1JeZCrKAFz144v85xNC11GZCYpZCVnZB9DOOpUwfPgiJPEY9lr1y0cYmeAZDZD";

async function discover() {
    console.log("--- Discovering WhatsApp Assets ---");
    try {
        // 1. Get WABAs
        const wabaRes = await fetch(`https://graph.facebook.com/v21.0/me/whatsapp_business_accounts?access_token=${TOKEN}`);
        const wabaData = await wabaRes.json();

        if (wabaData.error) {
            console.error("Error fetching WABAs:", wabaData.error.message);
            return;
        }

        console.log("\n[WhatsApp Business Accounts]");
        for (const waba of wabaData.data) {
            console.log(`- Name: ${waba.name}`);
            console.log(`  WABA_ID: ${waba.id}`);

            // 2. Get Phone Numbers for each WABA
            const phoneRes = await fetch(`https://graph.facebook.com/v21.0/${waba.id}/phone_numbers?access_token=${TOKEN}`);
            const phoneData = await phoneRes.json();

            console.log("  [Phone Numbers]");
            if (phoneData.data) {
                for (const phone of phoneData.data) {
                    console.log(`    - Display Name: ${phone.display_phone_number}`);
                    console.log(`      PHONE_NUMBER_ID: ${phone.id}`);
                    console.log(`      Status: ${phone.status}`);
                }
            } else {
                console.log("    No phone numbers found or error.");
            }
        }
    } catch (err) {
        console.error("Fatal Error:", err);
    }
}

discover();
