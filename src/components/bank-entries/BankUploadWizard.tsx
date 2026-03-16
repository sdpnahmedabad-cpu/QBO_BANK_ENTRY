"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { read, utils } from "xlsx";

// Sub-components
import { Step1Upload } from "./Step1Upload";
import { Step2Mapping } from "./Step2Mapping";
import { Step3Validation } from "./Step3Validation";
import { Step4Post } from "./Step4Post";

const STEPS = [
    { id: 1, label: "Upload Statement" },
    { id: 2, label: "Mapping" },
    { id: 3, label: "Validation" },
    { id: 4, label: "Post to QBO" },
];

export function BankUploadWizard() {
    const [currentStep, setCurrentStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [selectedBankId, setSelectedBankId] = useState<string>("");

    const [isParsing, setIsParsing] = useState(false);
    const [parsingError, setParsingError] = useState<string | null>(null);

    const handleFileSelect = (selectedFile: File) => {
        setFile(selectedFile);
    };

    const handleBankSelect = (id: string) => {
        setSelectedBankId(id);
    };

    const processFile = async () => {
        if (!file) return;

        setIsParsing(true);
        setParsingError(null);

        try {
            if (file.name.toLowerCase().endsWith('.pdf')) {
                const attemptParse = async (): Promise<boolean> => {
                    try {
                        const formData = new FormData();
                        formData.append('file', file);

                        const res = await fetch('/api/parser-n8n', {
                            method: 'POST',
                            body: formData
                        });

                        if (res.status === 429) {
                            throw new Error("Gemini AI is currently rate-limited. Please wait 5-10 minutes and try uploading again. (This is a temporary limit on the free API tier)");
                        }

                        if (!res.ok) {
                            const err = await res.json();
                            const errorMsg = err.error || "Unknown error";
                            const details = err.details || "";
                            const suggestion = err.suggestion || "";
                            throw new Error(`${errorMsg}\n\n${details}\n\n${suggestion}`.trim());
                        }

                        const result = await res.json();
                        const mappedData = result.transactions.map((t: any) => {
                            const debit = parseFloat(t.debit) || 0;
                            const credit = parseFloat(t.credit) || 0;
                            return {
                                'Date': t.date,
                                'Description': t.description,
                                'Amount': (credit - debit).toFixed(2),
                                'balance': t.balance,
                                'transaction_type': credit > 0 ? 'Income' : 'Expense'
                            };
                        });

                        setParsedData(mappedData);
                        setCurrentStep(prev => prev + 1);
                        return true;
                    } catch (error: any) {
                        throw error;
                    }
                };

                await attemptParse();
            } else {
                // Excel/CSV Parsing
                const buffer = await file.arrayBuffer();
                const workbook = read(buffer);
                const worksheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[worksheetName];
                const jsonData = utils.sheet_to_json(worksheet, {
                    raw: false,
                    dateNF: 'yyyy-mm-dd',
                    defval: ""
                });
                setParsedData(jsonData);
                setCurrentStep(prev => prev + 1);
            }
        } catch (error: any) {
            console.error("Error parsing file:", error);
            setParsingError(error.message || "Failed to parse file.");
        } finally {
            setIsParsing(false);
        }
    };

    const handleNext = () => {
        if (currentStep === 1) {
            processFile();
        } else if (currentStep < 4) {
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
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-white/10 -z-10" />
                <div className="flex justify-between">
                    {STEPS.map((step) => {
                        const isActive = currentStep >= step.id;
                        const isCurrent = currentStep === step.id;
                        return (
                            <div key={step.id} className="flex flex-col items-center bg-transparent px-4">
                                <div
                                    className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-2",
                                        isActive ? "bg-primary text-primary-foreground border-primary glow-primary" : "bg-black/40 text-muted-foreground border-white/10",
                                        isCurrent && "ring-4 ring-primary/20"
                                    )}
                                >
                                    {isActive ? <CheckCircle size={20} /> : step.id}
                                </div>
                                <span className={cn("text-xs font-medium mt-2", isActive ? "text-primary" : "text-muted-foreground")}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="w-full">
                <Card className="min-h-[500px] glass border-white/10">
                    <CardContent className="p-8 relative">
                        {isParsing && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4 rounded-xl">
                                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <div className="text-center">
                                    <p className="text-xl font-bold text-foreground">Analyzing Statement</p>
                                    <p className="text-muted-foreground text-sm">AI is extracting transactions...</p>
                                </div>
                            </div>
                        )}

                        {parsingError && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm flex flex-col space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">{parsingError}</span>
                                    <Button variant="ghost" size="sm" onClick={() => setParsingError(null)}>Dismiss</Button>
                                </div>
                            </div>
                        )}

                        {currentStep === 1 && (
                            <Step1Upload
                                onNext={handleNext}
                                onFileSelect={handleFileSelect}
                                selectedFile={file}
                                onBankSelect={handleBankSelect}
                                selectedBankId={selectedBankId}
                            />
                        )}
                        {currentStep === 2 && <Step2Mapping onNext={handleNext} onBack={handleBack} data={parsedData} setData={setParsedData} />}
                        {currentStep === 3 && <Step3Validation onNext={handleNext} onBack={handleBack} data={parsedData} />}
                        {currentStep === 4 && <Step4Post onBack={handleBack} onReset={handleReset} data={parsedData} bankAccountId={selectedBankId} />}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
