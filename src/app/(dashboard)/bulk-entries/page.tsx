import { BulkUploadWizard } from "@/components/bulk-entries/BulkUploadWizard";
import { QBOProtected } from "@/components/qbo/QBOProtected";

export default function BulkEntriesPage() {
    return (
        <QBOProtected>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground gradient-text">Post Bulk Entries</h1>
                        <p className="text-muted-foreground">Upload Excel sheets to bulk post Journal Entries, Sales, Purchases, and more to QuickBooks</p>
                    </div>
                </div>

                <BulkUploadWizard />
            </div>
        </QBOProtected>
    );
}
