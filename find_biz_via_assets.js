
const TOKEN = "EAALlcr5AuWYBQaCe9sM2jWzaZAZAMrLvQ8Eq5cuhkI94AkBJyHZAaRGjL43XvZCLiYMdsvOPjuFINJa3ioOVmNZAihYmKhFd0if4haijIdKhr2khZAELfZBL4ZCFV7xu3AbUUa58u2i5tKRr1JeZCrKAFz144v85xNC11GZCYpZCVnZB9DOOpUwfPgiJPEY9lr1y0cYmeAZDZD";

async function run() {
    try {
        console.log("Checking Ad Accounts...");
        const res = await fetch(`https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,business&access_token=${TOKEN}`);
        const data = await res.json();
        console.log("Ad Accounts:", JSON.stringify(data, null, 2));

        console.log("\nChecking Pages...");
        const pageRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${TOKEN}`);
        const pageData = await pageRes.json();
        console.log("Pages:", JSON.stringify(pageData, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
