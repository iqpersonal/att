
const TOKEN = "EAALlcr5AuWYBQaCe9sM2jWzaZAZAMrLvQ8Eq5cuhkI94AkBJyHZAaRGjL43XvZCLiYMdsvOPjuFINJa3ioOVmNZAihYmKhFd0if4haijIdKhr2khZAELfZBL4ZCFV7xu3AbUUa58u2i5tKRr1JeZCrKAFz144v85xNC11GZCYpZCVnZB9DOOpUwfPgiJPEY9lr1y0cYmeAZDZD";

async function run() {
    try {
        const res = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${TOKEN}`);
        const data = await res.json();

        if (data.data && data.data.length > 0) {
            const page = data.data[0];
            console.log(`Checking Business for Page: ${page.name}`);
            const bizRes = await fetch(`https://graph.facebook.com/v21.0/${page.id}?fields=business&access_token=${page.access_token}`);
            const bizData = await bizRes.json();
            console.log(`Business Info: ${JSON.stringify(bizData, null, 2)}`);

            if (bizData.business) {
                const bizId = bizData.business.id;
                console.log(`Found Business ID: ${bizId}. Checking WABAs...`);
                const wabaRes = await fetch(`https://graph.facebook.com/v21.0/${bizId}/owned_whatsapp_business_accounts?access_token=${TOKEN}`);
                const wabaData = await wabaRes.json();
                console.log(`Owned WABAs: ${JSON.stringify(wabaData, null, 2)}`);
            }
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
