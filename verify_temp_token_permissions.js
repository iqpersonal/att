
const TOKEN = "EAALlcr5AuWYBQTW9PKuYkwPBxGx6hg2sxPBoUesWq1CS5zcMawQZCBXbQXivaTQA364V43SBqzoqsnZCcYe0ZC2q26nmXWVT4Kwkm020ZAqfltXgaxNZAa8cgCilKCUcz1zlST0W8wYpzHrWaUyJcymzZApz452RX4Jan5rpllmZAiaT13UsSbo3J3OjgKLeUGUgnxPKWDv1wTdERIzpQKYxK10xhM2KtuMyEZA7L7gI8IMmgrhOELZBq8DdyZB57BEB2NstBjEMbDz0dZCjsvcp2lZB7gZDZD";

async function run() {
    try {
        console.log("Checking Me permissions...");
        const res = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name,permissions&access_token=${TOKEN}`);
        const data = await res.json();
        console.log("Token Owner:", JSON.stringify(data, null, 2));

        console.log("\nChecking associated accounts...");
        const accRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${TOKEN}`);
        const accData = await accRes.json();
        console.log("Accounts:", JSON.stringify(accData, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
