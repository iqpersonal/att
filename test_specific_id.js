
const TOKEN = "EAALlcr5AuWYBQaCe9sM2jWzaZAZAMrLvQ8Eq5cuhkI94AkBJyHZAaRGjL43XvZCLiYMdsvOPjuFINJa3ioOVmNZAihYmKhFd0if4haijIdKhr2khZAELfZBL4ZCFV7xu3AbUUa58u2i5tKRr1JeZCrKAFz144v85xNC11GZCYpZCVnZB9DOOpUwfPgiJPEY9lr1y0cYmeAZDZD";
const TARGET_ID = "25425371247051012";

async function run() {
    try {
        console.log(`Checking ID ${TARGET_ID}...`);
        const res = await fetch(`https://graph.facebook.com/v21.0/${TARGET_ID}?access_token=${TOKEN}`);
        const data = await res.json();
        console.log("Response:", JSON.stringify(data, null, 2));

        if (!data.error) {
            console.log("\nFetching Phone Numbers for this WABA...");
            const phoneRes = await fetch(`https://graph.facebook.com/v21.0/${TARGET_ID}/phone_numbers?access_token=${TOKEN}`);
            const phoneData = await phoneRes.json();
            console.log("Phone Numbers:", JSON.stringify(phoneData, null, 2));
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
