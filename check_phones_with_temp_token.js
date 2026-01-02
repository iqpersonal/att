
const TOKEN = "EAALlcr5AuWYBQTW9PKuYkwPBxGx6hg2sxPBoUesWq1CS5zcMawQZCBXbQXivaTQA364V43SBqzoqsnZCcYe0ZC2q26nmXWVT4Kwkm020ZAqfltXgaxNZAa8cgCilKCUcz1zlST0W8wYpzHrWaUyJcymzZApz452RX4Jan5rpllmZAiaT13UsSbo3J3OjgKLeUGUgnxPKWDv1wTdERIzpQKYxK10xhM2KtuMyEZA7L7gI8IMmgrhOELZBq8DdyZB57BEB2NstBjEMbDz0dZCjsvcp2lZB7gZDZD";

async function checkPhoneNumbers() {
    console.log("--- Checking Phone Numbers via Token ---");
    try {
        // First find WABAs visible to THIS token
        const wabaRes = await fetch(`https://graph.facebook.com/v21.0/me/whatsapp_business_accounts?access_token=${TOKEN}`);
        const wabaData = await wabaRes.json();
        console.log("WABAs:", JSON.stringify(wabaData, null, 2));

        if (wabaData.data && wabaData.data.length > 0) {
            for (const waba of wabaData.data) {
                console.log(`\nChecking Phone IDs for WABA: ${waba.id}`);
                const pRes = await fetch(`https://graph.facebook.com/v21.0/${waba.id}/phone_numbers?access_token=${TOKEN}`);
                const pData = await pRes.json();
                console.log("Phone Numbers:", JSON.stringify(pData, null, 2));
            }
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

checkPhoneNumbers();
