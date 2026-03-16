
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
try {
    const envPath = path.resolve(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split(/\r?\n/).forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^['"]|['"]$/g, ''); // Remove quotes
                process.env[key] = value;
            }
        });
        console.log('.env.local loaded successfully');
    } else {
        console.warn('.env.local file not found');
    }
} catch (e) {
    console.error('Error loading .env.local:', e);
}

async function reproduce() {
    console.log('--- REPRODUCING DATE ISSUE ---');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials in .env.local');
        return;
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: companies } = await supabase.from('quickbooks_clients').select('id').eq('is_active', true);
    if (!companies || companies.length === 0) { console.log('No active company in DB'); return; }
    const companyId = companies[0].id; // Use the first active company
    // const companyId = '4620816365345731770'; // Hardcode if known

    console.log(`Using Company ID: ${companyId}`);

    const date1 = '2023-01-01';
    const date2 = '2025-12-31';

    console.log(`\n1. Fetching for date: ${date1}`);
    await fetchReport(date1, companyId);

    console.log(`\n2. Fetching for date: ${date2}`);
    await fetchReport(date2, companyId);
}

async function fetchReport(date, companyId) {
    try {
        const url = `http://localhost:3000/api/qbo/reports/aged-receivables?date=${date}&companyId=${companyId}`;
        console.log(`fetching ${url}...`);
        const res = await fetch(url);

        if (res.ok) {
            const json = await res.json();
            // Try to find the date in the response headers or body if QBO returns it
            // Usually QBO returns Header -> StartPeriod/EndPeriod or similar
            const header = json.Header;
            if (header) {
                console.log(`Response Header Dates: Start=${header.StartPeriod}, End=${header.EndPeriod}, Time=${header.Time}`);
            } else {
                console.log('No Header in response');
                // console.log(JSON.stringify(json).substring(0, 200));
            }

            // Check total amount to see if it changes
            const rows = json.Rows?.Row;
            if (rows && rows.length > 0) {
                const summary = rows[rows.length - 1]; // Last row is usually summary
                if (summary && summary.Summary && summary.Summary.ColData) {
                    const total = summary.Summary.ColData[summary.Summary.ColData.length - 1].value;
                    console.log(`Total Receivables: ${total}`);
                }
            }

        } else {
            console.log(`Error: ${res.status} ${res.statusText}`);
            console.log(await res.text());
        }
    } catch (e) {
        console.error('Request failed:', e.message);
    }
}

reproduce();
