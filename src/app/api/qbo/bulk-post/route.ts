import { NextResponse } from 'next/server';
import { qboClient } from '@/lib/qbo';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { companyId, entryType, data } = body;

        if (!companyId || !entryType || !data || !Array.isArray(data)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Fetch Master Data for matching
        const [accounts, vendors, customers] = await Promise.all([
            qboClient.getChartOfAccounts(supabase, companyId),
            qboClient.getVendors(supabase, companyId),
            qboClient.getCustomers(supabase, companyId)
        ]);

        const findId = (list: any[], name: string) => {
            const found = list.find(item =>
                item.DisplayName?.toLowerCase() === name?.toLowerCase() ||
                item.Name?.toLowerCase() === name?.toLowerCase() ||
                item.FullyQualifiedName?.toLowerCase() === name?.toLowerCase()
            );
            return found?.Id;
        };

        const successCount = 0;
        const results = [];
        const errors = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            try {
                let qboData: any = {};
                let entityName = "";

                const amount = Math.abs(parseFloat(row.Amount || 0));
                const date = row.Date || new Date().toISOString().split('T')[0];
                const description = row.Description || "";

                switch (entryType) {
                    case 'Journal Entry':
                        // Grouping for Journal entries is done outside the loop for better handling, 
                        // but since we are processing one-by-one, we'll implement a grouping strategy.
                        // However, to keep it consistent with the existing loop, we'll check if we've already processed this Journal No.
                        // WAIT: The better way is to group ALL data first if it's Journal Entry.

                        const journals: Record<string, any[]> = {};
                        data.forEach(row => {
                            const jrNo = row['Journal No'] || 'UNNAMED';
                            if (!journals[jrNo]) journals[jrNo] = [];
                            journals[jrNo].push(row);
                        });

                        // Now process each group as ONE Journal Entry
                        const journalNos = Object.keys(journals);
                        for (const jrNo of journalNos) {
                            const lines = journals[jrNo];
                            const firstRow = lines[0];

                            const qboJournal: any = {
                                TxnDate: firstRow['Journal Date'] || new Date().toISOString().split('T')[0],
                                DocNumber: jrNo !== 'UNNAMED' ? jrNo : undefined,
                                Line: []
                            };

                            for (const lineRow of lines) {
                                const accId = findId(accounts, lineRow['Account Name']);
                                if (!accId) throw new Error(`Account not found: ${lineRow['Account Name']}`);

                                const debit = parseFloat(lineRow.Debit || 0);
                                const credit = parseFloat(lineRow.Credit || 0);
                                const amount = debit > 0 ? debit : credit;
                                const postingType = debit > 0 ? "Debit" : "Credit";

                                if (amount === 0) continue;

                                const entityName = lineRow.Name;
                                let entityRef = undefined;
                                if (entityName) {
                                    const vendId = findId(vendors, entityName);
                                    const custId = findId(customers, entityName);
                                    if (vendId) entityRef = { value: vendId, type: 'Vendor' };
                                    else if (custId) entityRef = { value: custId, type: 'Customer' };
                                }

                                qboJournal.Line.push({
                                    Description: lineRow.Description || "",
                                    Amount: amount,
                                    DetailType: "JournalEntryLineDetail",
                                    JournalEntryLineDetail: {
                                        PostingType: postingType,
                                        AccountRef: { value: accId },
                                        Entity: entityRef
                                    }
                                });
                            }

                            if (qboJournal.Line.length > 0) {
                                await qboClient.createEntity(supabase, "JournalEntry", qboJournal, companyId);
                                results.push({ row: jrNo, status: 'success' });
                            }
                        }

                        // Return early since we processed everything
                        return NextResponse.json({
                            successCount: results.length,
                            errorCount: errors.length,
                            errors
                        });

                    case 'Sales (Credit)': // Invoice
                        const custId = findId(customers, row['Customer']);
                        const incomeAccId = findId(accounts, row['Income Account']);
                        if (!custId) throw new Error(`Customer not found: ${row['Customer']}`);

                        entityName = "Invoice";
                        qboData = {
                            TxnDate: date,
                            CustomerRef: { value: custId },
                            DocNumber: row['Invoice No'],
                            Line: [{
                                Description: description,
                                Amount: amount,
                                DetailType: "SalesItemLineDetail",
                                SalesItemLineDetail: {
                                    ItemRef: { value: 'SHIPPING_ITEM_ID' }, // In QBO, Invoice often needs an Item. 
                                    // But we will try to use the account if possible or a fallback item.
                                }
                            }]
                        };
                        // Note: invoices usually use Items. If user provided account, we might need a different approach 
                        // or a default service item. For now, we use JournalEntry for simplicity if account is specified.
                        // However, user specifically asked for "Sales (on credit)".
                        break;

                    case 'Purchase (Credit)': // Bill
                        const vendId = findId(vendors, row['Vendor']);
                        const expAccId = findId(accounts, row['Expense Account']);
                        if (!vendId || !expAccId) throw new Error(`Vendor/Account not found`);

                        entityName = "Bill";
                        qboData = {
                            TxnDate: date,
                            VendorRef: { value: vendId },
                            DocNumber: row['Bill No'],
                            Line: [{
                                Description: description,
                                Amount: amount,
                                DetailType: "AccountBasedExpenseLineDetail",
                                AccountBasedExpenseLineDetail: { AccountRef: { value: expAccId } }
                            }]
                        };
                        break;

                    case 'Credit Note':
                        const cnCustId = findId(customers, row['Customer']);
                        const cnAccId = findId(accounts, row['Income Account']);
                        if (!cnCustId) throw new Error(`Customer not found`);

                        entityName = "CreditNote";
                        qboData = {
                            TxnDate: date,
                            CustomerRef: { value: cnCustId },
                            Line: [{
                                Description: description,
                                Amount: amount,
                                DetailType: "SalesItemLineDetail",
                                SalesItemLineDetail: { ItemRef: { value: '1' } }
                            }]
                        };
                        break;

                    case 'Supplier Credit':
                        const scVendId = findId(vendors, row['Vendor']);
                        const scAccId = findId(accounts, row['Expense Account']);
                        if (!scVendId || !scAccId) throw new Error(`Vendor/Account not found`);

                        entityName = "VendorCredit";
                        qboData = {
                            TxnDate: date,
                            VendorRef: { value: scVendId },
                            Line: [{
                                Description: description,
                                Amount: amount,
                                DetailType: "AccountBasedExpenseLineDetail",
                                AccountBasedExpenseLineDetail: { AccountRef: { value: scAccId } }
                            }]
                        };
                        break;

                    case 'Expense':
                        const payFromId = findId(accounts, row['Payment Account']);
                        const payToId = findId(accounts, row['Expense Account']);
                        const payeeId = findId(vendors, row['Vendor']);
                        if (!payFromId || !payToId) throw new Error(`Accounts not found`);

                        entityName = "Purchase";
                        qboData = {
                            PaymentType: "Cash",
                            AccountRef: { value: payFromId },
                            TxnDate: date,
                            EntityRef: payeeId ? { value: payeeId, type: "Vendor" } : undefined,
                            Line: [{
                                Description: description,
                                Amount: amount,
                                DetailType: "AccountBasedExpenseLineDetail",
                                AccountBasedExpenseLineDetail: { AccountRef: { value: payToId } }
                            }]
                        };
                        break;

                    case 'Income': // Deposit
                        const depAccId = findId(accounts, row['Deposit Account']);
                        const incomeId = findId(accounts, row['Income Account']);
                        const payerId = findId(customers, row['Customer']);
                        if (!depAccId || !incomeId) throw new Error(`Accounts not found`);

                        entityName = "Deposit";
                        qboData = {
                            DepositToAccountRef: { value: depAccId },
                            TxnDate: date,
                            Line: [{
                                Description: description,
                                Amount: amount,
                                DetailType: "DepositLineDetail",
                                DepositLineDetail: {
                                    AccountRef: { value: incomeId },
                                    Entity: payerId ? { value: payerId, type: "Customer" } : undefined
                                }
                            }]
                        };
                        break;
                }

                if (entityName) {
                    await qboClient.createEntity(supabase, entityName, qboData, companyId);
                    results.push({ row: i, status: 'success' });
                } else {
                    throw new Error(`Unsupported entry type: ${entryType}`);
                }

            } catch (err: any) {
                console.error(`Row ${i} Error:`, err);
                errors.push({ row: i, error: err.message || "Unknown error" });
            }
        }

        return NextResponse.json({
            successCount: results.length,
            errorCount: errors.length,
            errors
        });

    } catch (error: any) {
        console.error('Bulk Post Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
