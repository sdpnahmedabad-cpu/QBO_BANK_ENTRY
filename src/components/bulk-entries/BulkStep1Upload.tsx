"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud, Download, FileSpreadsheet, CheckCircle, ArrowRight, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { utils, writeFile } from "xlsx";
import { useStore } from "@/store/useStore";
import { BulkEntryType } from "./BulkUploadWizard";

interface BulkStep1UploadProps {
    entryType: BulkEntryType;
    setEntryType: (type: BulkEntryType) => void;
    onFileSelect: (file: File) => void;
    selectedFile: File | null;
    onNext: () => void;
    isParsing?: boolean;
}

const ENTRY_TYPES: BulkEntryType[] = [
    'Journal Entry',
    'Sales (Credit)',
    'Purchase (Credit)',
    'Credit Note',
    'Supplier Credit',
    'Expense',
    'Income'
];

const BULK_TEMPLATES: Record<BulkEntryType, string[]> = {
    'Journal Entry': ['Journal Date', 'Journal No', 'Account Name', 'Debit', 'Credit', 'Description', 'Name'],
    'Sales (Credit)': ['Customer', 'Date', 'Invoice No', 'Income Account', 'Description', 'Amount'],
    'Purchase (Credit)': ['Vendor', 'Date', 'Bill No', 'Expense Account', 'Description', 'Amount'],
    'Credit Note': ['Customer', 'Date', 'Credit Note No', 'Income Account', 'Description', 'Amount'],
    'Supplier Credit': ['Vendor', 'Date', 'Credit No', 'Expense Account', 'Description', 'Amount'],
    'Expense': ['Date', 'Payment Account', 'Expense Account', 'Vendor', 'Description', 'Amount'],
    'Income': ['Date', 'Deposit Account', 'Income Account', 'Customer', 'Description', 'Amount'],
};

export function BulkStep1Upload({ entryType, setEntryType, onFileSelect, selectedFile, onNext, isParsing }: BulkStep1UploadProps) {
    const { selectedCompany } = useStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDownloadReference = async (type: 'accounts' | 'vendors' | 'customers') => {
        if (!selectedCompany?.id) return;
        try {
            const res = await fetch(`/api/qbo/${type}?companyId=${selectedCompany.id}`);
            const data = await res.json();

            if (data.error) {
                console.error(`API Error fetching ${type}:`, data.error, data.details);
                alert(`Failed to fetch ${type}: ${data.error}. ${data.details || ''}`);
                return;
            }

            if (!Array.isArray(data)) {
                console.error(`Unexpected response for ${type}:`, data);
                alert(`Failed to fetch ${type}: Unexpected response format.`);
                return;
            }

            let exportData: any[] = [];
            let fileName = "";

            if (type === 'accounts') {
                exportData = data.map((a: any) => ({ 'Account Name': a.Name, 'Type': a.AccountType, 'Subtype': a.AccountSubType, 'Fully Qualified Name': a.FullyQualifiedName }));
                fileName = "Chart_of_Accounts.xlsx";
            } else if (type === 'vendors') {
                exportData = data.map((v: any) => ({ 'Vendor Name': v.DisplayName, 'Company': v.CompanyName, 'Email': v.PrimaryEmailAddr?.Address }));
                fileName = "Creditors_List.xlsx";
            } else if (type === 'customers') {
                exportData = data.map((c: any) => ({ 'Customer Name': c.DisplayName, 'Company': c.CompanyName, 'Email': c.PrimaryEmailAddr?.Address }));
                fileName = "Debtors_List.xlsx";
            }

            if (exportData.length === 0) {
                alert(`No ${type} found in your QuickBooks account.`);
                return;
            }

            const ws = utils.json_to_sheet(exportData);
            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, "Reference");
            writeFile(wb, fileName);
        } catch (err) {
            console.error("Failed to download reference data:", err);
            alert("Failed to download reference data. Please try again.");
        }
    };

    const handleDownloadTemplate = () => {
        const columns = BULK_TEMPLATES[entryType];
        const ws = utils.aoa_to_sheet([columns]);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Template");
        writeFile(wb, `${entryType.replace(/\s+/g, '_')}_Template.xlsx`);
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header with Tools */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/5">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black tracking-tight text-white uppercase italic">
                        Configure <span className="text-primary">Bulk Upload</span>
                    </h2>
                    <p className="text-muted-foreground font-medium">Select your transaction type and download latest QuickBooks data.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'accounts', label: 'Accounts', icon: FileSpreadsheet },
                        { id: 'vendors', label: 'Vendors', icon: Download },
                        { id: 'customers', label: 'Customers', icon: Download },
                    ].map((tool) => (
                        <Button
                            key={tool.id}
                            //@ts-ignore
                            onClick={() => handleDownloadReference(tool.id)}
                            variant="outline"
                            className="bg-white/5 border-white/10 hover:bg-primary/20 hover:border-primary/50 hover:text-white transition-all duration-300 rounded-xl px-4"
                        >
                            <tool.icon size={16} className="mr-2 opacity-70" />
                            {tool.label}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Type Selection - Left Column */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center font-black">01</div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Select Entry Type</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {ENTRY_TYPES.map((type) => (
                            <button
                                key={type}
                                onClick={() => setEntryType(type)}
                                className={cn(
                                    "px-5 py-4 rounded-2xl text-sm font-bold transition-all duration-500 text-left flex items-center justify-between group overflow-hidden relative border",
                                    entryType === type
                                        ? "bg-primary border-primary text-white shadow-[0_10px_30px_rgba(var(--primary),0.3)] scale-[1.02]"
                                        : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/10 hover:text-white"
                                )}
                            >
                                <span className="relative z-10 flex items-center gap-3">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full transition-all duration-500",
                                        entryType === type ? "bg-white scale-150" : "bg-white/20"
                                    )} />
                                    {type}
                                </span>
                                {entryType === type && <CheckCircle size={18} className="animate-in fade-in zoom-in duration-500" />}

                                {entryType === type && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Upload Section - Right Column */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center font-black">02</div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Post Your Data</h3>
                    </div>

                    <div className="space-y-6">
                        {/* Template Download Card */}
                        <div className="glass-premium p-8 rounded-[2rem] border-white/5 flex items-center justify-between group hover:border-primary/30 transition-all duration-500">
                            <div className="space-y-1">
                                <h4 className="text-lg font-bold text-white">Need a template?</h4>
                                <p className="text-sm text-muted-foreground">Download the professional {entryType} format.</p>
                            </div>
                            <Button
                                onClick={handleDownloadTemplate}
                                size="lg"
                                className="rounded-2xl bg-white text-black hover:bg-primary hover:text-white transition-all duration-500 shadow-xl"
                            >
                                <Download size={20} className="mr-2 group-hover:animate-bounce" />
                                Download
                            </Button>
                        </div>

                        {/* Dropzone */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                "border-2 border-dashed rounded-[2.5rem] p-16 text-center transition-all duration-700 cursor-pointer group relative overflow-hidden",
                                selectedFile
                                    ? "border-primary bg-primary/10 shadow-[0_0_50px_rgba(var(--primary),0.1)]"
                                    : "border-white/10 bg-white/[0.02] hover:border-primary/50 hover:bg-primary/5"
                            )}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".xlsx,.xls,.csv,.pdf"
                                onChange={onFileChange}
                            />

                            <div className="flex flex-col items-center relative z-10">
                                <div className={cn(
                                    "w-24 h-24 rounded-3xl flex items-center justify-center mb-6 transition-all duration-700",
                                    selectedFile
                                        ? "bg-primary text-white scale-110 rotate-3 shadow-[0_0_40px_rgba(var(--primary),0.4)]"
                                        : "bg-white/5 text-muted-foreground group-hover:text-primary group-hover:scale-110 group-hover:-rotate-3"
                                )}>
                                    {selectedFile ? <FileSpreadsheet size={48} /> : <UploadCloud size={48} />}
                                </div>

                                {selectedFile ? (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <p className="text-2xl font-black text-white tracking-tight">{selectedFile.name}</p>
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            <p className="text-sm text-primary font-bold uppercase tracking-widest">Ready to Import</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-2xl font-black text-white tracking-tight italic">DROP EXCEL FILE HERE</p>
                                        <p className="text-sm font-medium text-muted-foreground/60 tracking-wider">SUPPORTING .XLSX, .XLS, .CSV</p>
                                    </div>
                                )}
                            </div>

                            {/* Decorative elements */}
                            {!selectedFile && (
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                                    <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-primary/30 rounded-tl-2xl" />
                                    <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-primary/30 rounded-br-2xl" />
                                </div>
                            )}
                        </div>

                        {/* Bank Statement Parser Section */}
                        <div className="glass-premium p-8 rounded-[2rem] border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-primary/30 transition-all duration-500">
                            <div className="space-y-1">
                                <h4 className="text-lg font-bold text-white uppercase italic">Parse Bank Statement</h4>
                                <p className="text-sm text-muted-foreground">Upload a PDF bank statement to automatically extract entries using AI.</p>
                            </div>
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                size="lg"
                                disabled={isParsing}
                                className="rounded-2xl bg-primary text-white hover:shadow-glow transition-all duration-500 w-full md:w-auto"
                            >
                                {isParsing ? (
                                    <Loader2 size={20} className="mr-2 animate-spin" />
                                ) : (
                                    <FileText size={20} className="mr-2 group-hover:rotate-12 transition-transform" />
                                )}
                                {isParsing ? "Parsing AI..." : "Import from Bank PDF"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-white/10">
                <Button
                    onClick={onNext}
                    disabled={!selectedFile}
                    className="px-10 h-12 rounded-xl bg-gradient-to-r from-primary to-accent hover:shadow-glow hover:scale-[1.02] transition-all font-bold text-white disabled:opacity-50 disabled:scale-100"
                >
                    Continue to Preview
                    <ArrowRight size={18} className="ml-2" />
                </Button>
            </div>
        </div>
    );
}

