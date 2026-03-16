const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function listModels() {
    const apiKey = "AIzaSyAtFBE1naWyqPm_PwAqmY572k_zqliVq5U";
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                console.log(`- ${m.name} (${m.displayName})`);
            });
        } else {
            console.log("No models found or error:", JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
