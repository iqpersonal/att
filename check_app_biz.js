
const TOKEN = "EAALlcr5AuWYBQaCe9sM2jWzaZAZAMrLvQ8Eq5cuhkI94AkBJyHZAaRGjL43XvZCLiYMdsvOPjuFINJa3ioOVmNZAihYmKhFd0if4haijIdKhr2khZAELfZBL4ZCFV7xu3AbUUa58u2i5tKRr1JeZCrKAFz144v85xNC11GZCYpZCVnZB9DOOpUwfPgiJPEY9lr1y0cYmeAZDZD";
const APP_ID = "815230934366566";

async function run() {
    try {
        console.log("Checking App Business Info...");
        const appRes = await fetch(`https://graph.facebook.com/v21.0/${APP_ID}?fields=id,name,business&access_token=${TOKEN}`);
        const appData = await appRes.json();
        console.log("App Data:", JSON.stringify(appData, null, 2));

        console.log("\nChecking Me Info...");
        const meRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name,business&access_token=${TOKEN}`);
        const meData = await meRes.json();
        console.log("Me Data:", JSON.stringify(meData, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
