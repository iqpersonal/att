
const TOKEN = "EAALlcr5AuWYBQTW9PKuYkwPBxGx6hg2sxPBoUesWq1CS5zcMawQZCBXbQXivaTQA364V43SBqzoqsnZCcYe0ZC2q26nmXWVT4Kwkm020ZAqfltXgaxNZAa8cgCilKCUcz1zlST0W8wYpzHrWaUyJcymzZApz452RX4Jan5rpllmZAiaT13UsSbo3J3OjgKLeUGUgnxPKWDv1wTdERIzpQKYxK10xhM2KtuMyEZA7L7gI8IMmgrhOELZBq8DdyZB57BEB2NstBjEMbDz0dZCjsvcp2lZB7gZDZD";

async function run() {
    try {
        console.log("Checking App Fields...");
        const res = await fetch(`https://graph.facebook.com/v21.0/815230934366566?fields=id,name,category,link&access_token=${TOKEN}`);
        const data = await res.json();
        console.log("App Info:", JSON.stringify(data, null, 2));

        console.log("\nChecking WhatsApp Product Registration...");
        // This is a shot in the dark to see if the product is registered
        const pRes = await fetch(`https://graph.facebook.com/v21.0/815230934366566/plugins?access_token=${TOKEN}`);
        const pData = await pRes.json();
        console.log("Plugins/Products:", JSON.stringify(pData, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
