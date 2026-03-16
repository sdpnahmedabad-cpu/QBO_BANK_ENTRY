"use client";

import { MasterRulesPanel } from "@/components/master-rules/MasterRulesPanel";

export default function MasterRulesPage() {
    return (
        <div className="space-y-6 h-[calc(100vh-100px)]">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground gradient-text">Master Rules Engine</h1>
                    <p className="text-muted-foreground">Create high-level automation rules and distribute them to connected clients.</p>
                </div>
            </div>

            <div className="h-full">
                <MasterRulesPanel />
            </div>
        </div>
    );
}
