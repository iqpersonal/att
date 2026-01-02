
const TOKEN = "EAALlcr5AuWYBQaCe9sM2jWzaZAZAMrLvQ8Eq5cuhkI94AkBJyHZAaRGjL43XvZCLiYMdsvOPjuFINJa3ioOVmNZAihYmKhFd0if4haijIdKhr2khZAELfZBL4ZCFV7xu3AbUUa58u2i5tKRr1JeZCrKAFz144v85xNC11GZCYpZCVnZB9DOOpUwfPgiJPEY9lr1y0cYmeAZDZD";

async function run() {
    try {
        console.log("Checking Me/Businesses...");
        const res = await fetch(`https://graph.facebook.com/v21.0/me/businesses?access_token=${TOKEN}`);
        const data = await res.json();
        console.log("Businesses:", JSON.stringify(data, null, 2));

        if (data.data && data.data.length > 0) {
            for (const biz of data.data) {
                console.log(`\nChecking WABAs for Business ${biz.name} (${biz.id})...`);
                const wabaRes = await fetch(`https://graph.facebook.com/v21.0/${biz.id}/owned_whatsapp_business_accounts?access_token=${TOKEN}`);
                const wabaData = await wabaRes.json();
                console.log("Owned WABAs:", JSON.stringify(wabaData, null, 2));

                const clientWabaRes = await fetch(`https://graph.facebook.com/v21.0/${biz.id}/client_whatsapp_business_accounts?access_token=${TOKEN}`);
                const clientWabaData = await clientWabaRes.json();
                console.log("Client WABAs:", JSON.stringify(clientWabaData, null, 2));
            }
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
