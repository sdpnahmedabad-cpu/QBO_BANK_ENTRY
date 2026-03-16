import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface Step4Props {
    onBack: () => void;
    onReset?: () => void;
    data: any[];
    bankAccountId?: string;
}

export function Step4Post({ onBack, onReset, data, bankAccountId }: Step4Props) {
    const [status, setStatus] = useState<'posting' | 'success' | 'error' | 'partial'>('posting');
    const [result, setResult] = useState<{ success: number; errors: number; details: any[] } | null>(null);
    const hasPosted = useRef(false);

    useEffect(() => {
        if (!hasPosted.current) {
            hasPosted.current = true;
            postTransactions();
        }
    }, []);

    const postTransactions = async () => {
        try {
            const res = await fetch('/api/qbo/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactions: data,
                    bankAccountId: bankAccountId
                })
            });

            const json = await res.json();

            setResult({
                success: json.successCount || 0,
                errors: json.errorCount || 0,
                details: json.errors || []
            });

            if (res.ok) {
                if (json.errorCount > 0) {
                    setStatus('partial');
                } else {
                    setStatus('success');
                }
            } else {
                setStatus('error');
            }
        } catch (e) {
            setStatus('error');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-6 py-10">
            {status === 'success' ? (
                <div className="bg-green-500/20 p-6 rounded-full glow-green">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
            ) : status === 'error' ? (
                <div className="bg-red-500/20 p-6 rounded-full glow-red">
                    <AlertTriangle className="h-16 w-16 text-red-500" />
                </div>
            ) : status === 'partial' ? (
                <div className="bg-yellow-500/20 p-6 rounded-full glow-yellow">
                    <AlertTriangle className="h-16 w-16 text-yellow-500" />
                </div>
            ) : (
                <div className="bg-blue-500/20 p-6 rounded-full animate-pulse glow-blue">
                    <CheckCircle className="h-16 w-16 text-blue-500" />
                </div>
            )}

            <h2 className="text-2xl font-bold text-foreground">
                {status === 'posting' && "Posting to QuickBooks..."}
                {status === 'success' && "Posting Complete!"}
                {status === 'partial' && "Posting Completed with Issues"}
                {status === 'error' && "Posting Failed"}
            </h2>



            <div className="text-center space-y-2">
                {status === 'posting' && <p className="text-muted-foreground">Processing {data.length} entries...</p>}

                {(status === 'success' || status === 'partial') && result && (
                    <div className="text-sm">
                        <p className="text-green-500 font-medium">Successfully posted: {result.success}</p>
                        {result.errors > 0 && (
                            <div className="mt-2">
                                <p className="text-red-500 font-medium">Failed: {result.errors}</p>
                                <div className="mt-2 max-h-[150px] overflow-y-auto text-left bg-white/5 p-2 rounded text-xs text-red-400 border border-red-500/20">
                                    {result.details.map((err: any, i: number) => (
                                        <div key={i} className="mb-1">
                                            • {err.error} <span className="text-muted-foreground">({err.txn?.Description})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {status === 'error' && <p className="text-muted-foreground">Please check your connection or data and try again.</p>}
            </div>

            <Button
                variant="outline"
                onClick={status === 'success' ? (onReset || onBack) : onBack}
                disabled={status === 'posting'}
                className="border-white/10 hover:bg-white/5 hover:text-primary"
            >
                {status === 'success' ? "Post More" : "Back"}
            </Button>
        </div>
    );
}
