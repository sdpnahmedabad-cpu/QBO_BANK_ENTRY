const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/debug-pdf',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            const parsedData = JSON.parse(rawData);
            console.log('BODY:', JSON.stringify(parsedData, null, 2));
        } catch (e) {
            console.log('BODY (raw):', rawData);
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
