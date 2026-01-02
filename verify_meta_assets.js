
const TOKEN = "EAALlcr5AuWYBQaCe9sM2jWzaZAZAMrLvQ8Eq5cuhkI94AkBJyHZAaRGjL43XvZCLiYMdsvOPjuFINJa3ioOVmNZAihYmKhFd0if4haijIdKhr2khZAELfZBL4ZCFV7xu3AbUUa58u2i5tKRr1JeZCrKAFz144v85xNC11GZCYpZCVnZB9DOOpUwfPgiJPEY9lr1y0cYmeAZDZD";

async function checkToken() {
    console.log("--- Checking Token Permissions ---");
    try {
        const res = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name,permissions&access_token=${TOKEN}`);
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));

        if (data.id) {
            console.log("\n--- Checking Accounts ---");
            const accRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${TOKEN}`);
            const accData = await accRes.json();
            console.log("Managed Pages/Accounts:", JSON.stringify(accData, null, 2));

            console.log("\n--- Checking WABAs again ---");
            const wabaRes = await fetch(`https://graph.facebook.com/v21.0/me/whatsapp_business_accounts?access_token=${TOKEN}`);
            const wabaData = await wabaRes.json();
            console.log("WABAs:", JSON.stringify(wabaData, null, 2));
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

checkToken();
