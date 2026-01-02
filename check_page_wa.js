
const TOKEN = "EAALlcr5AuWYBQaCe9sM2jWzaZAZAMrLvQ8Eq5cuhkI94AkBJyHZAaRGjL43XvZCLiYMdsvOPjuFINJa3ioOVmNZAihYmKhFd0if4haijIdKhr2khZAELfZBL4ZCFV7xu3AbUUa58u2i5tKRr1JeZCrKAFz144v85xNC11GZCYpZCVnZB9DOOpUwfPgiJPEY9lr1y0cYmeAZDZD";

async function run() {
    try {
        const res = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,category,access_token&access_token=${TOKEN}`);
        const data = await res.json();

        if (data.data && data.data.length > 0) {
            for (const page of data.data) {
                console.log(`PAGE FOUND: ${page.name} (ID: ${page.id})`);

                // Check for linked WhatsApp
                const waRes = await fetch(`https://graph.facebook.com/v21.0/${page.id}?fields=whatsapp_number,connected_instagram_account&access_token=${page.access_token}`);
                const waData = await waRes.json();
                console.log(`WhatsApp Info: ${JSON.stringify(waData, null, 2)}`);
            }
        } else {
            console.log("No Pages found.");
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
