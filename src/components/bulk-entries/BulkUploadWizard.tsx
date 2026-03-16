"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { read, utils } from "xlsx";

// Sub-components
import { BulkStep1Upload } from "./BulkStep1Upload";
import { BulkStep2Preview } from "./BulkStep2Preview";
import { BulkStep3Post } from "./BulkStep3Post";

const STEPS = [
    { id: 1, label: "Upload Excel" },
    { id: 2, label: "Preview & Validate" },
    { id: 3, label: "Post to QBO" },
];

export type BulkEntryType =
    | 'Journal Entry'
    | 'Sales (Credit)'
    | 'Purchase (Credit)'
    | 'Credit Note'
    | 'Supplier Credit'
    | 'Expense'
    | 'Income';

export function BulkUploadWizard() {
    const [currentStep, setCurrentStep] = useState(1);
    const [isParsing, setIsParsing] = useState(false);
    const [entryType, setEntryType] = useState<BulkEntryType>('Journal Entry');
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);

    const handleFileSelect = (selectedFile: File) => {
        setFile(selectedFile);
    };

    // Auto-process PDF files
    useEffect(() => {
        if (file && file.name.toLowerCase().endsWith('.pdf') && currentStep === 1 && !isParsing) {
            processFile();
        }
    }, [file]);

    const processFile = async () => {
        if (!file) return;

        try {
            setIsParsing(true);
            if (file.name.toLowerCase().endsWith('.pdf')) {
                // PDF Parsing using Gemini AI
                const formData = new FormData();
                formData.append('file', file);

                const res = await fetch('/api/parser', {
                    method: 'POST',
                    body: formData
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || err.details || "Failed to parse PDF");
                }

                const result = await res.json();

                // Map Gemini format to expected Excel-like format if needed
                // Gemini returns: { date, description, debit, credit, balance }
                // Excel columns are: ['Journal Date', 'Journal No', 'Account Name', 'Debit', 'Credit', 'Description', 'Name']

                const mappedData = result.transactions.map((t: any) => ({
                    'Date': t.date,
                    'Description': t.description,
                    'Debit': t.debit,
                    'Credit': t.credit,
                    'Balance': t.balance,
                    // Fill other fields if it's for a specific entry type, 
                    // though Bank Entry format is slightly different.
                }));

                setParsedData(mappedData);
                setCurrentStep(2);
            } else {
                // Excel/CSV Parsing
                const data = await file.arrayBuffer();
                const workbook = read(data);
                const worksheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[worksheetName];
                const jsonData = utils.sheet_to_json(worksheet, {
                    raw: false,
                    dateNF: 'yyyy-mm-dd',
                    defval: ""
                });
                setParsedData(jsonData);
                setCurrentStep(2);
            }
        } catch (error: any) {
            console.error("Error parsing file:", error);
            alert("Failed to parse file: " + error.message);
        } finally {
            setIsParsing(false);
        }
    };

    const handleNext = () => {
        if (currentStep === 1) {
            processFile();
        } else if (currentStep < 3) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(prev => prev - 1);
    };

    const handleReset = () => {
        setFile(null);
        setParsedData([]);
        setCurrentStep(1);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-12 py-4">
            {/* Wizard Progress Header */}
            <div className="relative px-4">
                <div className="absolute top-[20px] left-0 w-full h-[2px] bg-white/5 -z-10" />
                <div className="flex justify-between max-w-4xl mx-auto relative">
                    {STEPS.map((step) => {
                        const isActive = currentStep >= step.id;
                        const isCurrent = currentStep === step.id;
                        return (
                            <div key={step.id} className="flex flex-col items-center group relative">
                                <div
                                    className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 border-2 z-10",
                                        isActive
                                            ? "bg-primary text-primary-foreground border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                                            : "bg-slate-900 text-muted-foreground border-white/10 group-hover:border-white/20",
                                        isCurrent && "scale-125 ring-8 ring-primary/10"
                                    )}
                                >
                                    {isActive && currentStep > step.id ? <CheckCircle size={20} className="animate-in zoom-in duration-300" /> : step.id}
                                </div>
                                <div className="absolute top-12 whitespace-nowrap">
                                    <span className={cn(
                                        "text-xs font-bold tracking-wider uppercase transition-colors duration-300",
                                        isActive ? "text-primary" : "text-muted-foreground/60"
                                    )}>
                                        {step.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Content */}
            <div className="w-full pt-8">
                <Card className="min-h-[600px] glass-premium border-white/5 shadow-2xl overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                    <CardContent className="p-10 relative z-10">
                        {currentStep === 1 && (
                            <BulkStep1Upload
                                entryType={entryType}
                                setEntryType={setEntryType}
                                onFileSelect={handleFileSelect}
                                selectedFile={file}
                                onNext={handleNext}
                                isParsing={isParsing}
                            />
                        )}
                        {currentStep === 2 && (
                            <BulkStep2Preview
                                entryType={entryType}
                                data={parsedData}
                                setData={setParsedData}
                                onNext={handleNext}
                                onBack={handleBack}
                            />
                        )}
                        {currentStep === 3 && (
                            <BulkStep3Post
                                entryType={entryType}
                                data={parsedData}
                                onBack={handleBack}
                                onReset={handleReset}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
