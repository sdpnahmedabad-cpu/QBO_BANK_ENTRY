const OAuthClient = require('intuit-oauth');
const fs = require('fs');
const path = require('path');

const CLIENT_ID = 'ABKPYOsxJi0ru19t8zow9ESd8CTpXbYVi1USUvrdgDZYu9caYz';
const CLIENT_SECRET = 'wbOFVtgH06kipWtWn8fC783yKaucT6xx00Rpff4B';
const ENVIRONMENT = 'sandbox';
const REDIRECT_URI = 'http://localhost:3000/api/auth/qbo/callback';
const TOKEN_FILE = path.join(process.cwd(), 'qbo-tokens.json');
const LOG_FILE = path.join(process.cwd(), 'test-output.txt');

function log(msg) {
    try {
        fs.appendFileSync(LOG_FILE, msg + '\n');
        console.log(msg);
    } catch (e) { }
}

try {
    fs.writeFileSync(LOG_FILE, 'STARTING TEST\n');
} catch (e) { }

async function testConnection() {
    try {
        log('Reading tokens...');

        if (!fs.existsSync(TOKEN_FILE)) {
            log('No token file');
            return;
        }

        const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
        log('Tokens loaded. RealmId: ' + tokens.realmId);

        const client = new OAuthClient({
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            environment: ENVIRONMENT,
            redirectUri: REDIRECT_URI,
        });

        client.setToken(tokens);
        log('Token set.');

        if (!client.isAccessTokenValid()) {
            log('Refreshing token...');
            const authResponse = await client.refresh();
            log('Refreshed.');
            client.setToken(authResponse.getJson());
        }

        const companyID = client.getToken().realmId;
        const url = client.environment === 'sandbox' ? OAuthClient.environment.sandbox : OAuthClient.environment.production;

        const endpoint = `${url}v3/company/${companyID}/reports/AgedReceivables?minorversion=65`;
        log('Calling URL: ' + endpoint);

        try {
            const response = await client.makeApiCall({ url: endpoint, method: 'GET' });

            log('Response Object Keys: ' + Object.keys(response).join(', '));

            if (response.response) {
                log('Status Code: ' + response.response.statusCode);
            }
            log('Body Preview: ' + (response.body ? response.body.substring(0, 500) : 'No Body'));

            const json = response.getJson();
            log('JSON Parsed OK.');
        } catch (apiErr) {
            log('API Error: ' + apiErr.message);
            throw apiErr;
        }

    } catch (e) {
        log('CRITICAL ERROR CAUGHT:');
        log('Message: ' + e.message);
        if (e.response) {
            log('Error Response Status: ' + e.response.statusCode);
            try {
                log('Error Response Body: ' + JSON.stringify(e.response.body));
            } catch (err) {
                log('Error Response Body (raw): ' + e.response.body);
            }
        }
        if (e.originalMessage) log('Original: ' + e.originalMessage);
    }
}

testConnection();
