const http = require('http');
const fs = require('fs');
const path = require('path');

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const filePath = path.join(__dirname, 'test_upload.pdf');

if (!fs.existsSync(filePath)) {
    console.log("ERROR: test_upload.pdf not found");
    process.exit(1);
}

const fileContent = fs.readFileSync(filePath);

const postDataStart = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="test_upload.pdf"`,
    `Content-Type: application/pdf`,
    '',
    ''
].join('\r\n');

const postDataEnd = `\r\n--${boundary}--`;

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/parser-n8n',
    method: 'POST',
    headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(postDataStart) + fileContent.length + Buffer.byteLength(postDataEnd)
    }
};

console.log('Testing n8n PDF parser API...\n');

const req = http.request(options, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('\nResponse:');
        try {
            const parsed = JSON.parse(rawData);
            console.log(JSON.stringify(parsed, null, 2));

            if (parsed.transactions) {
                console.log('\n✅ SUCCESS! Extracted', parsed.transactions.length, 'transactions via n8n');
            } else if (parsed.error) {
                console.log('\n❌ ERROR:', parsed.error);
                if (parsed.details) console.log('Details:', parsed.details);
            }
        } catch (e) {
            console.log(rawData);
        }
    });
});

req.on('error', (e) => {
    console.error('Request failed:', e.message);
});

req.write(postDataStart);
req.write(fileContent);
req.write(postDataEnd);
req.end();
