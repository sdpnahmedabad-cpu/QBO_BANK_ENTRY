"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { BulkEntryType } from "./BulkUploadWizard";
import { Badge } from "@/components/ui/badge";

interface BulkStep2PreviewProps {
    entryType: BulkEntryType;
    data: any[];
    setData: (data: any[]) => void;
    onNext: () => void;
    onBack: () => void;
}

export function BulkStep2Preview({ entryType, data, setData, onNext, onBack }: BulkStep2PreviewProps) {
    const { selectedCompany } = useStore();
    const [accounts, setAccounts] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [validationResults, setValidationResults] = useState<Record<number, Record<string, boolean>>>({});

    useEffect(() => {
        const fetchMasterData = async () => {
            if (!selectedCompany?.id) return;
            setIsLoading(true);
            try {
                const [accRes, venRes, custRes] = await Promise.all([
                    fetch(`/api/qbo/accounts?companyId=${selectedCompany.id}`),
                    fetch(`/api/qbo/vendors?companyId=${selectedCompany.id}`),
                    fetch(`/api/qbo/customers?companyId=${selectedCompany.id}`)
                ]);

                const [accData, venData, custData] = await Promise.all([
                    accRes.json(),
                    venRes.json(),
                    custRes.json()
                ]);

                setAccounts(accData);
                setVendors(venData);
                setCustomers(custData);
            } catch (err) {
                console.error("Failed to fetch master data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMasterData();
    }, [selectedCompany?.id]);

    useEffect(() => {
        if (accounts.length === 0) return;

        const results: Record<number, Record<string, boolean>> = {};
        data.forEach((row, index) => {
            results[index] = {};
            columns.forEach(col => {
                const val = row[col]?.toString().trim().toLowerCase();
                const key = col.toLowerCase();

                // If value is empty, it's invalid if it's a mandatory field (contains Account, Vendor, Customer)
                if (!val) {
                    if (key.includes('account') || key.includes('vendor') || key.includes('customer')) {
                        results[index][col] = false;
                    }
                    return;
                }

                if (key.includes('account')) {
                    results[index][col] = accounts.some(a => a.Name.toLowerCase() === val || a.FullyQualifiedName.toLowerCase() === val);
                } else if (key === 'debit' || key === 'credit') {
                    results[index][col] = !isNaN(parseFloat(val)) || val === "";
                } else if (key === 'name') {
                    results[index][col] = vendors.some(v => v.DisplayName.toLowerCase() === val) ||
                        customers.some(c => c.DisplayName.toLowerCase() === val) ||
                        val === ""; // Name is optional in JE
                } else if (key.includes('vendor')) {
                    results[index][col] = vendors.some(v => v.DisplayName.toLowerCase() === val);
                } else if (key.includes('customer') || key.includes('payor')) {
                    results[index][col] = customers.some(c => c.DisplayName.toLowerCase() === val);
                } else {
                    results[index][col] = true; // Default to valid for other fields like Description or Journal No
                }
            });
        });
        setValidationResults(results);
    }, [data, accounts, vendors, customers]);

    const isValid = Object.values(validationResults).every(row =>
        Object.values(row).every(field => field)
    );

    const columns = data.length > 0 ? Object.keys(data[0]) : [];

    const isBankStatement = columns.includes('Debit') && columns.includes('Credit') && columns.includes('Balance');

    const totals = isBankStatement ? data.reduce((acc, row) => {
        acc.debit += parseFloat(row['Debit'] || 0);
        acc.credit += parseFloat(row['Credit'] || 0);
        return acc;
    }, { debit: 0, credit: 0 }) : null;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/5">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black tracking-tight text-white uppercase italic">
                        Preview <span className="text-primary">& Validate</span>
                    </h2>
                    <p className="text-muted-foreground font-medium">
                        Cross-checking your data against QuickBooks ledgers.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all duration-500",
                        isValid
                            ? "bg-green-500/10 border-green-500/20 text-green-400"
                            : "bg-orange-500/10 border-orange-500/20 text-orange-400"
                    )}>
                        {isValid ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                        <span className="font-black uppercase tracking-widest text-xs">
                            {isValid ? "All Ledgers Match" : "Action Required"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="glass-premium rounded-[2rem] overflow-hidden border-white/5 relative min-h-[400px] shadow-inner-glow">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-30">
                        <div className="flex flex-col items-center space-y-6">
                            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-glow" />
                            <p className="text-sm font-black uppercase tracking-[0.2em] text-white">Syncing QuickBooks data...</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                        <Table>
                            <TableHeader className="bg-white/[0.03] sticky top-0 z-20">
                                <TableRow className="hover:bg-transparent border-white/5">
                                    {columns.map(col => (
                                        <TableHead key={col} className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 py-5 px-8">
                                            {col}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((row, i) => (
                                    <TableRow key={i} className="hover:bg-white/[0.02] border-white/5 transition-colors group">
                                        {columns.map(col => {
                                            const isInvalid = validationResults[i]?.[col] === false;
                                            return (
                                                <TableCell key={col} className="py-4 px-8 text-sm text-foreground">
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn(
                                                            "font-medium transition-colors duration-300",
                                                            isInvalid ? "text-red-400" :
                                                                (col === 'Debit' && parseFloat(row[col]) > 0) ? "text-red-400" :
                                                                    (col === 'Credit' && parseFloat(row[col]) > 0) ? "text-green-400" :
                                                                        "group-hover:text-primary"
                                                        )}>
                                                            {row[col] || (isInvalid ? "REQUIRED" : "—")}
                                                        </span>
                                                        {isInvalid && (
                                                            <div className="text-red-400 animate-pulse" title={!row[col] ? "Required field is empty" : "No matching entry found in QuickBooks"}>
                                                                <AlertTriangle size={16} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                                {totals && (
                                    <TableRow className="bg-white/[0.05] border-t-2 border-white/10 font-black">
                                        {columns.map(col => (
                                            <TableCell key={`total-${col}`} className="py-6 px-8 text-sm">
                                                {col === 'Description' && <span className="text-muted-foreground uppercase tracking-widest">Grand Total</span>}
                                                {col === 'Debit' && <span className="text-red-400">₹{totals.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>}
                                                {col === 'Credit' && <span className="text-green-400">₹{totals.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-10 border-t border-white/5">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="group rounded-2xl px-8 h-12 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all duration-300"
                >
                    <ArrowLeft size={18} className="mr-3 group-hover:-translate-x-1 transition-transform" />
                    Back to Upload
                </Button>

                <div className="flex flex-col md:flex-row items-center gap-8">
                    {!isValid && (
                        <div className="flex items-center gap-3 text-red-400 bg-red-400/5 px-6 py-2 rounded-xl border border-red-400/10">
                            <AlertTriangle size={18} />
                            <p className="text-xs font-bold uppercase tracking-wider">Resolve ledger errors to proceed</p>
                        </div>
                    )}

                    <Button
                        onClick={onNext}
                        disabled={!isValid || isLoading || data.length === 0}
                        className="group flex-1 md:flex-none px-12 h-14 rounded-2xl bg-white text-black hover:bg-primary hover:text-white transition-all duration-500 font-black uppercase tracking-widest shadow-2xl disabled:opacity-30 disabled:grayscale"
                    >
                        Confirm & Process
                        <ArrowRight size={18} className="ml-3 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
