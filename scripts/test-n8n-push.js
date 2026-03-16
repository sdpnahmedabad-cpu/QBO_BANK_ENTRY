const http = require('http');

const apiKey = 'YOUR_ACTUAL_API_KEY_HERE'; // Replace with a key from the UI for actual testing

const testData = {
    "transactions": [
        {
            "transaction_date": "2026-03-12",
            "description": "Test n8n Push",
            "amount_in": 1500.00,
            "balance": 5000.00
        },
        {
            "date": "2026-03-11",
            "memo": "Test n8n Push 2",
            "debit": 25.50,
            "balance": 3500.00
        }
    ]
};

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/public/bank-entries',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
    }
};

console.log('Testing n8n-to-Finza Push API...\n');

const req = http.request(options, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('\nResponse:');
        try {
            const parsed = JSON.parse(rawData);
            console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
            console.log(rawData);
        }
    });
});

req.on('error', (e) => {
    console.error('Request failed:', e.message);
});

req.write(JSON.stringify(testData));
req.end();
