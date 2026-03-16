const fs = require('fs');
const path = require('path');

async function testDebug() {
    const fetch = (await import('node-fetch')).default;
    const FormData = (await import('formdata-node')).FormData;
    const { fileFromPath } = await import('formdata-node/file-from-path');

    const form = new FormData();
    const filePath = path.join(__dirname, 'test_upload.pdf');

    // We need to properly attach the file
    // Since we don't have 'file-from-path' easily available in simple node script without installing deps,
    // let's try a simpler approach using native fetch in Node 18+ or just 'http' module with manual multipart boundary.
    // Or just rely on the fact that I can use Python or just Powershell Invoke-RestMethod?

    // Simpler: Use the existing check-pdf script logic but point to debug endpoint.
    // Actually, I can use the 'test-pdf-local.js' concept but hit the API.

    // Let's use a pure http request with boundary construction to avoid dependency hell in this script.
}

// Rewriting to simple node http script without deps
const http = require('http');
const fs2 = require('fs');

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const filePath = 'test_upload.pdf';

if (!fs2.existsSync(filePath)) {
    console.log("Test file not found");
    process.exit(1);
}

const fileContent = fs2.readFileSync(filePath);

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
    path: '/api/parser-fast-debug',
    method: 'POST',
    headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(postDataStart) + fileContent.length + Buffer.byteLength(postDataEnd)
    }
};

const req = http.request(options, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            const parsed = JSON.parse(rawData);
            console.log('DEBUG TEXT OUTPUT:');
            console.log(parsed.text);
        } catch (e) {
            console.log('RAW RESPONSE:', rawData);
        }
    });
});

req.write(postDataStart);
req.write(fileContent);
req.write(postDataEnd);
req.end();
