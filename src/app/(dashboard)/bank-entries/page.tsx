import { BankUploadWizard } from "@/components/bank-entries/BankUploadWizard";
import { QBOProtected } from "@/components/qbo/QBOProtected";

export default function BankEntriesPage() {
    return (
        <QBOProtected>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground gradient-text">Post Bank Entries</h1>
                        <p className="text-muted-foreground">Upload bank statements and map transactions to QuickBooks ledgers</p>
                    </div>
                </div>

                <BankUploadWizard />
            </div>
        </QBOProtected>
    );
}
