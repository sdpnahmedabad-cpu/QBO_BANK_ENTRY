async function test() {
    const res = await fetch('http://localhost:3000/api/qbo/accounts?type=Bank&companyId=9341455370836467');
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Data:', JSON.stringify(data, null, 2));
}

test().catch(console.error);
