"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, Rocket } from "lucide-react";
import { useStore } from "@/store/useStore";
import { BulkEntryType } from "./BulkUploadWizard";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface BulkStep3PostProps {
    entryType: BulkEntryType;
    data: any[];
    onBack: () => void;
    onReset: () => void;
}

export function BulkStep3Post({ entryType, data, onBack, onReset }: BulkStep3PostProps) {
    const { selectedCompany } = useStore();
    const [isPosting, setIsPosting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<{ success: number; errors: any[] } | null>(null);

    const handlePost = async () => {
        if (!selectedCompany?.id) return;
        setIsPosting(true);
        setResults(null);
        setProgress(10);

        try {
            const isBankEntry = data.length > 0 && 'Balance' in data[0];
            const endpoint = isBankEntry ? "/api/bank-entries/bulk-create" : "/api/qbo/bulk-post";

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyId: selectedCompany.id,
                    entryType,
                    data
                })
            });

            const result = await res.json();
            setProgress(100);
            setResults({
                success: result.successCount || 0,
                errors: result.errors || []
            });
        } catch (err: any) {
            console.error("Bulk Post Error:", err);
            setResults({
                success: 0,
                errors: [{ error: err.message || "Failed to post entries" }]
            });
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="animate-in fade-in zoom-in duration-700 max-w-3xl mx-auto py-12">
            {results ? (
                <div className="text-center space-y-10">
                    <div className={cn(
                        "w-32 h-32 rounded-[2.5rem] flex items-center justify-center mx-auto transition-all duration-1000 scale-110 relative",
                        results.errors.length === 0
                            ? "bg-green-500/20 text-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)] rotate-12"
                            : "bg-orange-500/20 text-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.3)] -rotate-6"
                    )}>
                        {results.errors.length === 0 ? <CheckCircle2 size={64} className="animate-in zoom-in duration-700" /> : <AlertCircle size={64} />}

                        {results.errors.length === 0 && (
                            <div className="absolute -inset-4 bg-green-500/10 rounded-full animate-ping -z-10" />
                        )}
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic">
                            {results.errors.length === 0 ? "MISSION SUCCESS" : "PROCESS COMPLETE"}
                        </h2>
                        <p className="text-xl text-muted-foreground font-medium">
                            Successfully integrated <span className="text-white font-bold">{results.success}</span> {entryType}s into your QuickBooks.
                        </p>
                    </div>

                    {results.errors.length > 0 && (
                        <div className="glass-premium p-8 rounded-[2rem] border-orange-500/20 text-left space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                            <h4 className="text-sm font-black uppercase tracking-widest text-orange-400 flex items-center gap-2">
                                <AlertCircle size={16} />
                                Identified Issues ({results.errors.length})
                            </h4>
                            <div className="space-y-3">
                                {results.errors.map((err, i) => (
                                    <div key={i} className="text-xs bg-white/5 p-4 rounded-xl border border-white/5 flex gap-4">
                                        <span className="text-white/40 font-black">#{i + 1}</span>
                                        <p className="text-muted-foreground leading-relaxed"><span className="text-white font-bold">Line {err.row}:</span> {err.error}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-10">
                        <Button
                            onClick={onReset}
                            size="lg"
                            className="h-16 rounded-[1.5rem] bg-white text-black hover:bg-primary hover:text-white transition-all duration-500 px-12 font-black uppercase tracking-widest shadow-2xl group"
                        >
                            <RefreshCw size={22} className="mr-3 group-hover:rotate-180 transition-transform duration-700" />
                            Launch New Import
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="text-center space-y-12 py-10">
                    <div className="space-y-6">
                        <div className="w-24 h-24 bg-primary/20 text-primary rounded-[2rem] flex items-center justify-center mx-auto shadow-inner-glow relative group">
                            <Rocket size={48} className={cn(
                                "transition-transform duration-1000",
                                isPosting ? "animate-bounce" : "group-hover:-translate-y-2"
                            )} />
                            <div className="absolute -inset-2 bg-primary/20 rounded-full blur-2xl animate-pulse -z-10" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Ready for Ignition</h2>
                            <p className="text-muted-foreground/80 font-medium text-lg max-w-md mx-auto">
                                Confirming the transfer of <span className="text-white font-black">{data.length}</span> {entryType} records to QuickBooks Online.
                            </p>
                        </div>
                    </div>

                    {isPosting && (
                        <div className="space-y-6 animate-in slide-in-from-top-4 duration-700">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Synchronizing Data</span>
                                <span className="text-2xl font-black italic text-white tracking-tighter">{progress}%</span>
                            </div>
                            <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-1">
                                <div
                                    className="h-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-shimmer rounded-full transition-all duration-700 shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row gap-4 pt-8">
                        <Button
                            disabled={isPosting}
                            variant="ghost"
                            onClick={onBack}
                            className="flex-1 h-14 rounded-2xl border border-white/10 hover:bg-white/5 hover:text-white transition-all duration-300 font-bold uppercase tracking-wider disabled:opacity-20"
                        >
                            <ArrowLeft size={18} className="mr-3" />
                            Verification
                        </Button>
                        <Button
                            disabled={isPosting}
                            onClick={handlePost}
                            className="flex-[2] h-16 rounded-[1.5rem] bg-primary text-white hover:bg-white hover:text-black transition-all duration-700 font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(var(--primary),0.3)] disabled:opacity-50 group overflow-hidden relative"
                        >
                            <span className="relative z-10 flex items-center justify-center">
                                {isPosting ? (
                                    <>
                                        <RefreshCw size={22} className="mr-3 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Confirm & Post Records
                                        <Rocket size={22} className="ml-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    </>
                                )}
                            </span>
                            {!isPosting && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
