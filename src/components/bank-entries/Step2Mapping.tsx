/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useStore } from "@/store/useStore";

interface Step2Props {
    onNext: () => void;
    onBack: () => void;
    data: any[];
    setData: (data: any[]) => void;
}

export function Step2Mapping({ onNext, onBack, data, setData }: Step2Props) {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { selectedCompany } = useStore();
    const [isApplyingRules, setIsApplyingRules] = useState(false);
    const hasAppliedRules = useRef(false);

    const applyRules = async (currentData: any[]) => {
        setIsApplyingRules(true);
        try {
            const res = await fetch('/api/rules/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId: selectedCompany.id, transactions: currentData })
            });
            if (res.ok) {
                const { transactions: mappedData, applied } = await res.json();
                if (applied) {
                    const finalData = mappedData.map((row: any) => {
                        let updatedRow = { ...row };

                        // Apply transaction type from rule
                        if (row.suggested_type) {
                            updatedRow.transaction_type = row.suggested_type;
                        }

                        // Apply account/ledger from rule
                        if (row.suggested_ledger) {
                            const suggested = row.suggested_ledger.toString().trim().toLowerCase();
                            const acc = accounts.find(a => a.Name.toString().trim().toLowerCase() === suggested);
                            if (acc) {
                                updatedRow.qbo_account_id = acc.Id;
                            } else {
                                console.warn(`[ApplyRules] Ledger "${row.suggested_ledger}" not found in accounts list.`);
                            }
                        }

                        // Apply contact/payee from rule
                        if (row.suggested_contact_id) {
                            const contactId = row.suggested_contact_id.toString();
                            const isCustType = ["Income", "Credit Note"].includes(updatedRow.transaction_type);
                            if (isCustType) {
                                updatedRow.qbo_customer_id = contactId;
                            } else {
                                updatedRow.qbo_vendor_id = contactId;
                            }
                        }

                        return updatedRow;
                    });
                    setData(finalData);
                }
            }
        } catch (error) {
            console.error("Failed to apply rules", error);
        } finally {
            setIsApplyingRules(false);
        }
    };

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [accRes, venRes, cusRes] = await Promise.all([
                    fetch(`/api/qbo/accounts?companyId=${selectedCompany.id}`),
                    fetch(`/api/qbo/vendors?companyId=${selectedCompany.id}`),
                    fetch(`/api/qbo/customers?companyId=${selectedCompany.id}`)
                ]);

                const accData = await accRes.json();
                const venData = await venRes.json();
                const cusData = await cusRes.json();

                setAccounts(accData || []);
                setVendors(venData || []);
                setCustomers(cusData || []);
            } catch (error) {
                console.error("Failed to fetch QBO master data", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Rule Application on Load
    useEffect(() => {
        const initAndApply = async () => {
            if (!isLoading && data.length > 0 && !hasAppliedRules.current && accounts.length > 0) {
                hasAppliedRules.current = true;

                // Prepare data if missing transaction_type
                const initializedData = data.map(row => {
                    if (!row.hasOwnProperty('transaction_type')) {
                        const amountVal = parseFloat(row.Amount || row.amount || "0");
                        return {
                            ...row,
                            transaction_type: amountVal > 0 ? 'Income' : 'Expense',
                            qbo_account_id: row.qbo_account_id || "",
                            rule_applied: row.rule_applied || ""
                        };
                    }
                    return row;
                });

                // Apply rules
                try {
                    const res = await fetch('/api/rules/apply', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ companyId: selectedCompany.id, transactions: initializedData })
                    });

                    if (res.ok) {
                        const { transactions: mappedData } = await res.json();
                        const finalData = mappedData.map((row: any) => {
                            let updatedRow = { ...row };

                            // Apply transaction type from rule
                            if (row.suggested_type) {
                                updatedRow.transaction_type = row.suggested_type;
                            }

                            // Apply account/ledger from rule
                            if (row.suggested_ledger) {
                                const suggested = row.suggested_ledger.toString().trim().toLowerCase();
                                const acc = accounts.find((a: any) => a.Name.toString().trim().toLowerCase() === suggested);
                                if (acc) {
                                    updatedRow.qbo_account_id = acc.Id;
                                } else {
                                    console.warn(`[InitApplyRules] Ledger "${row.suggested_ledger}" not found in accounts list.`);
                                }
                            }

                            // Apply contact/payee from rule
                            if (row.suggested_contact_id) {
                                const contactId = row.suggested_contact_id.toString();
                                const isCustType = ["Income", "Credit Note"].includes(updatedRow.transaction_type);
                                if (isCustType) {
                                    updatedRow.qbo_customer_id = contactId;
                                } else {
                                    updatedRow.qbo_vendor_id = contactId;
                                }
                            }

                            return updatedRow;
                        });
                        setData(finalData);
                    } else {
                        setData(initializedData);
                    }
                } catch (e) {
                    console.error("Failed to apply rules on init", e);
                    setData(initializedData);
                }
            }
        };

        initAndApply();
    }, [isLoading, data, accounts, selectedCompany.id, setData]);

    const updateRow = (index: number, field: string, value: string | number) => {
        const newData = [...data];
        newData[index] = { ...newData[index], [field]: value };
        setData(newData);
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">Step 2: Review & Map Transactions</h2>
            <div className="flex justify-between items-center bg-blue-500/10 p-4 rounded-md text-blue-400 border border-blue-500/20">
                <span>Found {data.length} transactions. Map them to QBO Accounts, Vendors, or Customers.</span>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void applyRules(data)}
                    disabled={isApplyingRules}
                    className="border-blue-500/30 hover:bg-blue-500/20 text-blue-400"
                >
                    {isApplyingRules ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                    Apply Rules
                </Button>
            </div>

            <div className="border rounded-lg overflow-hidden border-white/10 shadow-sm glass">
                <div className="overflow-x-auto max-h-[600px]">
                    <table className="min-w-full divide-y divide-white/10">
                        <thead className="bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Description</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-muted-foreground uppercase">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase w-[150px]">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase w-[200px]">Account (Ledger)</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase w-[200px]">Contact / Payee</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Rule</th>
                            </tr>
                        </thead>
                        <tbody className="bg-transparent divide-y divide-white/10">
                            {data.map((row, i) => {
                                const type = row.transaction_type || 'Expense';
                                const isTransfer = type === 'Transfer';
                                const isJournal = type === 'Journal Entry';
                                const isIncome = type === 'Income' || type === 'Credit Note';

                                const ledgerOptions = isTransfer
                                    ? accounts.filter((a: any) => a.AccountType === 'Bank' || a.AccountType === 'Credit Card')
                                    : isJournal
                                        ? accounts
                                        : isIncome
                                            ? accounts.filter((a: any) => a.Classification === 'Revenue' || a.AccountType === 'Income' || a.AccountType === 'Other Income')
                                            : accounts.filter((a: any) => a.Classification === 'Expense' || a.AccountType === 'Expense' || a.AccountType === 'Cost of Goods Sold');

                                return (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-2 whitespace-nowrap text-sm text-foreground">
                                            {row['Date'] || row['date']}
                                        </td>
                                        <td className="px-6 py-2 whitespace-nowrap text-sm text-foreground">
                                            <Input
                                                value={row['Description'] || row['description'] || ""}
                                                onChange={(e) => updateRow(i, row.Description ? 'Description' : 'description', e.target.value)}
                                                className="h-8 w-full min-w-[200px] bg-black/20 border-white/10 text-foreground"
                                            />
                                        </td>
                                        <td className="px-6 py-2 whitespace-nowrap text-sm text-foreground text-right font-medium">
                                            {row['Amount'] || row['amount']}
                                        </td>
                                        <td className="px-6 py-2 whitespace-nowrap">
                                            <select
                                                className="h-8 w-full border rounded text-sm p-1 bg-black/20 border-white/10 text-foreground"
                                                value={row.transaction_type || 'Expense'}
                                                onChange={(e) => updateRow(i, 'transaction_type', e.target.value)}
                                            >
                                                <option value="Expense">Expense</option>
                                                <option value="Income">Income</option>
                                                <option value="Transfer">Transfer</option>
                                                <option value="Check">Check</option>
                                                <option value="Bill">Bill</option>
                                                <option value="Purchase">Purchase</option>
                                                <option value="Credit Card Credit">Credit Card Credit</option>
                                                <option value="Credit Note">Credit Note</option>
                                                <option value="Journal Entry">Journal Entry</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-2 whitespace-nowrap">
                                            <select
                                                className="h-8 w-full border rounded text-sm p-1 bg-black/20 border-white/10 text-foreground"
                                                value={row.qbo_account_id || ""}
                                                onChange={(e) => updateRow(i, 'qbo_account_id', e.target.value)}
                                            >
                                                <option value="">
                                                    {isTransfer ? 'Select Target Bank' : 'Select Account'}
                                                </option>
                                                {ledgerOptions.map(acc => (
                                                    <option key={acc.Id} value={acc.Id}>{acc.Name}</option>
                                                ))}
                                                {ledgerOptions.length === 0 && <option disabled>No matching accounts found</option>}
                                            </select>
                                        </td>
                                        <td className="px-6 py-2 whitespace-nowrap">
                                            {(!isTransfer && !isJournal) ? (
                                                <select
                                                    className="h-8 w-full border rounded text-sm p-1 bg-black/20 border-white/10 text-foreground"
                                                    value={isIncome ? (row.qbo_customer_id || "") : (row.qbo_vendor_id || "")}
                                                    onChange={(e) => updateRow(i, isIncome ? 'qbo_customer_id' : 'qbo_vendor_id', e.target.value)}
                                                >
                                                    <option value="">{isIncome ? 'Select Customer' : 'Select Vendor'}</option>
                                                    {(isIncome ? customers : vendors).map(c => (
                                                        <option key={c.Id} value={c.Id}>{c.DisplayName}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">N/A for {type}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-2 whitespace-nowrap">
                                            <Badge variant="outline" className="bg-white/10 text-muted-foreground font-normal border-white/10">
                                                {row.rule_applied || "Manual"}
                                            </Badge>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-between">
                <Button variant="outline" onClick={onBack} className="border-white/10 hover:bg-white/5 hover:text-primary">Back</Button>
                <div className="space-x-2">
                    <Button onClick={onNext} className="glow-primary">Validate & Next</Button>
                </div>
            </div>
        </div>
    );
}
