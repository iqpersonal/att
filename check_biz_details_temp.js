
const TOKEN = "EAALlcr5AuWYBQTW9PKuYkwPBxGx6hg2sxPBoUesWq1CS5zcMawQZCBXbQXivaTQA364V43SBqzoqsnZCcYe0ZC2q26nmXWVT4Kwkm020ZAqfltXgaxNZAa8cgCilKCUcz1zlST0W8wYpzHrWaUyJcymzZApz452RX4Jan5rpllmZAiaT13UsSbo3J3OjgKLeUGUgnxPKWDv1wTdERIzpQKYxK10xhM2KtuMyEZA7L7gI8IMmgrhOELZBq8DdyZB57BEB2NstBjEMbDz0dZCjsvcp2lZB7gZDZD";

async function run() {
    try {
        console.log("Checking shared WABAs...");
        const res = await fetch(`https://graph.facebook.com/v21.0/1129731335683548/shared_whatsapp_business_accounts?access_token=${TOKEN}`);
        const data = await res.json();
        console.log("Shared WABAs:", JSON.stringify(data, null, 2));

        console.log("\nChecking business information...");
        const bizRes = await fetch(`https://graph.facebook.com/v21.0/1129731335683548?fields=id,name,vertical,whatsapp_business_accounts&access_token=${TOKEN}`);
        const bizData = await bizRes.json();
        console.log("Business Data:", JSON.stringify(bizData, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
