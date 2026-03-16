// Test the rules API endpoint
async function testRulesAPI() {
    console.log('--- TESTING RULES API ---\n');

    const companyId = '9341455370836467'; // The active company

    try {
        const res = await fetch(`http://localhost:3000/api/rules?companyId=${companyId}`);
        console.log(`Status: ${res.status} ${res.statusText}`);
        console.log(`Content-Type: ${res.headers.get('content-type')}`);

        if (res.ok) {
            const data = await res.json();
            console.log(`\nReturned ${Array.isArray(data) ? data.length : 'N/A'} rules`);
            console.log('\nData:', JSON.stringify(data, null, 2));
        } else {
            const text = await res.text();
            console.log('\nError response:', text.substring(0, 500));
        }
    } catch (e) {
        console.error('Request failed:', e.message);
    }
}

testRulesAPI();
