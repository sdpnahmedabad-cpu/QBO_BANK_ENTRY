// Test vendors and accounts APIs
async function testAPIs() {
    const companyId = '9341455370836467';

    console.log('--- TESTING VENDORS API ---');
    try {
        const vendorsRes = await fetch(`http://localhost:3000/api/qbo/vendors?companyId=${companyId}`);
        console.log(`Vendors: ${vendorsRes.status} ${vendorsRes.statusText}`);
        if (vendorsRes.ok) {
            const vendors = await vendorsRes.json();
            console.log(`Found ${Array.isArray(vendors) ? vendors.length : 'N/A'} vendors`);
            if (vendors.length > 0) {
                console.log('Sample:', vendors[0].DisplayName || vendors[0].Name);
            }
        } else {
            console.log('Error:', await vendorsRes.text());
        }
    } catch (e) {
        console.error('Vendors API failed:', e.message);
    }

    console.log('\n--- TESTING ACCOUNTS API (for expense ledgers) ---');
    try {
        const accountsRes = await fetch(`http://localhost:3000/api/qbo/accounts?companyId=${companyId}`);
        console.log(`Accounts: ${accountsRes.status} ${accountsRes.statusText}`);
        if (accountsRes.ok) {
            const accounts = await accountsRes.json();
            console.log(`Found ${Array.isArray(accounts) ? accounts.length : 'N/A'} accounts`);

            // Filter for expense accounts
            const expenseAccounts = accounts.filter(a =>
                a.AccountType === 'Expense' ||
                a.AccountType === 'Cost of Goods Sold' ||
                a.AccountType === 'Other Expense'
            );
            console.log(`Expense accounts: ${expenseAccounts.length}`);
            if (expenseAccounts.length > 0) {
                console.log('Sample:', expenseAccounts[0].Name);
            }
        } else {
            console.log('Error:', await accountsRes.text());
        }
    } catch (e) {
        console.error('Accounts API failed:', e.message);
    }
}

testAPIs();
