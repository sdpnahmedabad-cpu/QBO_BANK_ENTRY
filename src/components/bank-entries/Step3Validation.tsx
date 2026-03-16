import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";


interface Step3Props {
    onNext: () => void;
    onBack: () => void;
    data: any[];
}

export function Step3Validation({ onNext, onBack, data }: Step3Props) {
    // Basic validation
    const errors: string[] = [];
    if (!data || data.length === 0) {
        errors.push("No data found in file.");
    } else {
        let missingDate = 0;
        let missingDesc = 0;
        let missingAmount = 0;
        let missingType = 0;
        let missingAccount = 0;

        data.forEach(row => {
            if (!row.Date && !row.date) missingDate++;
            if (!row.Description && !row.description) missingDesc++;
            if (!row.Amount && !row.amount) missingAmount++;
            if (!row.transaction_type) missingType++;
            if (!row.qbo_account_id) missingAccount++;
        });

        if (missingDate > 0) errors.push(`${missingDate} rows missing Date.`);
        if (missingDesc > 0) errors.push(`${missingDesc} rows missing Description.`);
        if (missingAmount > 0) errors.push(`${missingAmount} rows missing Amount.`);
        if (missingType > 0) errors.push(`${missingType} rows missing Transaction Type.`);
        if (missingAccount > 0) errors.push(`${missingAccount} rows missing Account selection.`);
    }

    const isValid = errors.length === 0;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">Step 3: Validation</h2>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-sm text-muted-foreground">Total Rows</p>
                    <p className="text-2xl font-bold text-foreground">{data.length}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className={`text-2xl font-bold ${isValid ? 'text-green-500' : 'text-red-500'}`}>
                        {isValid ? "Valid" : "Issues Found"}
                    </p>
                </div>
            </div>

            <div className="border rounded-lg p-4 bg-white/5 min-h-[200px] border-white/10">
                {errors.length > 0 ? (
                    <div className="space-y-2">
                        {errors.map((err, i) => (
                            <div key={i} className="flex items-center text-red-500">
                                <AlertCircle className="mr-2 h-4 w-4" />
                                <span>{err}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-green-500 space-y-2">
                        <CheckCircle2 className="h-12 w-12" />
                        <span className="font-medium">Data looks good!</span>
                        <p className="text-sm text-muted-foreground">Ready to post {data.length} entries.</p>
                    </div>
                )}
            </div>

            <div className="flex justify-between">
                <Button variant="outline" onClick={onBack} className="border-white/10 hover:bg-white/5 hover:text-primary">Back</Button>
                <Button onClick={onNext} disabled={!isValid} className="bg-green-600 hover:bg-green-700 text-white glow-green">Ready to Post</Button>
            </div>
        </div>
    );
}
