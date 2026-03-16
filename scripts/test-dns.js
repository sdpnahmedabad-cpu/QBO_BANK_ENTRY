const https = require('https');

const url = 'https://oauth.platform.intuit.com/op/v1/token';

console.log('Testing connectivity to:', url);

const req = https.get(url, (res) => {
    console.log('Status code:', res.statusCode);
    console.log('Headers:', res.headers);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
}).on('error', (e) => {
    console.error('ERROR:', e.message);
    if (e.code === 'ENOTFOUND') {
        console.error('DNS Resolution failed!');
    }
});

req.end();
