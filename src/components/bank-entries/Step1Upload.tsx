"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, X, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/store/useStore";

interface Step1Props {
    onNext: () => void;
    onFileSelect: (file: File) => void;
    selectedFile: File | null;
    onBankSelect: (bankId: string) => void;
    selectedBankId: string;
}

export function Step1Upload({ onNext, onFileSelect, selectedFile, onBankSelect, selectedBankId }: Step1Props) {
    const { selectedCompany } = useStore();
    const [isDragOver, setIsDragOver] = useState(false);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [loadingBanks, setLoadingBanks] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBanks = async () => {
            if (!selectedCompany?.id) {
                setLoadingBanks(false);
                return;
            }

            setLoadingBanks(true);
            setError(null);

            try {
                const res = await fetch(`/api/qbo/accounts?type=Bank&companyId=${selectedCompany.id}`);

                if (res.status === 401) {
                    setError("Session expired. Please reconnect to QuickBooks.");
                    setLoadingBanks(false);
                    return;
                }

                if (!res.ok) {
                    throw new Error('Failed to fetch banks');
                }

                const data = await res.json();
                const accounts = Array.isArray(data) ? data : (data.QueryResponse?.Account || []);

                setBankAccounts(accounts);

                if (accounts.length === 0) {
                    setError("No bank accounts found. Please ensure you have connected the correct company.");
                } else if (!selectedBankId && accounts.length > 0) {
                    // Auto-select first account
                    onBankSelect(accounts[0].Id);
                }
            } catch (error: any) {
                console.error("Fetch error:", error);
                setError("Unable to load bank accounts.");
            } finally {
                setLoadingBanks(false);
            }
        };

        fetchBanks();
    }, [selectedCompany?.id, selectedBankId, onBankSelect]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground gradient-text">Upload Bank Statement</h2>
                <p className="text-muted-foreground">Select your bank and upload the statement</p>
            </div>

            <div className="w-full max-w-xl space-y-4">
                {/* Error Message */}
                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                        <p>{error}</p>
                    </div>
                )}

                {/* Bank Selector */}
                <div className="space-y-2">
                    <Label className="text-muted-foreground">Select Bank Account</Label>
                    <Select value={selectedBankId} onValueChange={onBankSelect} disabled={loadingBanks || bankAccounts.length === 0}>
                        <SelectTrigger className="bg-black/20 border-white/10 text-foreground">
                            <SelectValue placeholder={loadingBanks ? "Loading..." : "Select a Bank Account"} />
                        </SelectTrigger>
                        <SelectContent>
                            {bankAccounts.map((acc: any) => (
                                <SelectItem key={acc.Id} value={acc.Id}>
                                    {acc.Name} ({acc.CurrencyRef?.value || 'USD'})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* File Upload */}
                <div
                    className={`w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isDragOver ? "border-primary bg-primary/10" : "border-white/10 bg-white/5 hover:border-primary/50 hover:bg-white/10"
                        }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload')?.click()}
                >
                    {selectedFile ? (
                        <div className="flex flex-col items-center space-y-3">
                            <div className="bg-primary/20 p-4 rounded-full glow-primary">
                                {selectedFile.name.toLowerCase().endsWith('.pdf') ? (
                                    <FileText className="h-10 w-10 text-primary" />
                                ) : (
                                    <FileSpreadsheet className="h-10 w-10 text-green-500" />
                                )}
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-medium text-foreground">{selectedFile.name}</p>
                                <p className="text-sm text-muted-foreground">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                            </div>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); onFileSelect(null as any); }}>
                                <X className="mr-2 h-4 w-4" /> Remove File
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center space-y-3">
                            <div className="bg-white/5 p-4 rounded-full border border-white/10">
                                <Upload className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-medium text-foreground">Drag & Drop file here</p>
                                <p className="text-sm text-muted-foreground">or click to browse</p>
                            </div>
                        </div>
                    )}
                    <Input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept=".csv, .xlsx, .xls, .pdf"
                        onChange={handleFileChange}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-between w-full max-w-xl gap-4">
                <Button variant="outline" className="w-full sm:w-auto text-slate-500">
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Download Template
                </Button>

                <Button
                    onClick={onNext}
                    disabled={!selectedFile || !selectedBankId}
                    size="lg"
                    className="w-full sm:w-auto"
                >
                    {selectedFile?.name.toLowerCase().endsWith('.pdf') ? 'Analyze with AI' : 'Process Bank Statement'} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>

            <div className="text-xs text-slate-400 mt-8 max-w-md text-center">
                <p>Use the template above to format your bank statement.</p>
            </div>
        </div>
    );
}

function ArrowRight(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
        </svg>
    )
}
