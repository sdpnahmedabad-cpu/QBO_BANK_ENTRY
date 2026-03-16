const https = require('https');

const apiKey = "AIzaSyAtFBE1naWyqPm_PwAqmY572k_zqliVq5U";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log("Listing available models...");

https.get(url, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        try {
            const data = JSON.parse(body);
            if (data.models) {
                console.log("Available Models:");
                data.models.forEach(m => {
                    console.log(`- ${m.name}`);
                });
            } else {
                console.log("Error response:", JSON.stringify(data, null, 2));
            }
        } catch (e) {
            console.log("Failed to parse response:", body);
        }
    });
}).on('error', (e) => {
    console.error("Error:", e.message);
});
