
const TOKEN = "EAALlcr5AuWYBQaCe9sM2jWzaZAZAMrLvQ8Eq5cuhkI94AkBJyHZAaRGjL43XvZCLiYMdsvOPjuFINJa3ioOVmNZAihYmKhFd0if4haijIdKhr2khZAELfZBL4ZCFV7xu3AbUUa58u2i5tKRr1JeZCrKAFz144v85xNC11GZCYpZCVnZB9DOOpUwfPgiJPEY9lr1y0cYmeAZDZD";
const BIZ_ID = "1129731335683548";

async function run() {
    try {
        console.log(`Checking Client WABAs for Business ${BIZ_ID}...`);
        const res = await fetch(`https://graph.facebook.com/v21.0/${BIZ_ID}/client_whatsapp_business_accounts?access_token=${TOKEN}`);
        const data = await res.json();
        console.log(`Client WABAs: ${JSON.stringify(data, null, 2)}`);
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
