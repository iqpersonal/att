
const TOKEN = "EAALlcr5AuWYBQaCe9sM2jWzaZAZAMrLvQ8Eq5cuhkI94AkBJyHZAaRGjL43XvZCLiYMdsvOPjuFINJa3ioOVmNZAihYmKhFd0if4haijIdKhr2khZAELfZBL4ZCFV7xu3AbUUa58u2i5tKRr1JeZCrKAFz144v85xNC11GZCYpZCVnZB9DOOpUwfPgiJPEY9lr1y0cYmeAZDZD";

async function run() {
    const url = `https://graph.facebook.com/v21.0/debug_token?input_token=${TOKEN}&access_token=${TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();
    console.log("TOKEN DEBUG INFO:");
    console.log(JSON.stringify(data, null, 2));
}

run();
