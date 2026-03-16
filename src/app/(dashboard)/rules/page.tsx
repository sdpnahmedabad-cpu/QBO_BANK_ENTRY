"use client";

import { RulesPanel } from "@/components/bank-entries/RulesPanel";

export default function RulesPage() {
    return (
        <div className="space-y-6 h-[calc(100vh-100px)]">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground gradient-text">Rules Engine</h1>
                    <p className="text-muted-foreground">Manage automation rules for bank transaction mapping</p>
                </div>
            </div>

            <div className="h-full">
                <RulesPanel />
            </div>
        </div>
    );
}
