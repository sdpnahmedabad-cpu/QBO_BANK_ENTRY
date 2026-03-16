"use client";

import { useEffect, useState } from "react";
import { Building2, Calendar, Clock } from "lucide-react";

interface ReportHeaderProps {
    dateRange: { start: string; end: string };
}

export function ReportHeader({ dateRange }: ReportHeaderProps) {
    const [companyName, setCompanyName] = useState<string>("Loading...");
    const [generatedTime] = useState(new Date().toLocaleString());

    useEffect(() => {
        // Fetch company info
        fetch("/api/qbo/company-info")
            .then((res) => res.json())
            .then((data) => {
                const name = data.CompanyInfo?.CompanyName || data.companyName || "Company";
                setCompanyName(name);
            })
            .catch(() => setCompanyName("Company"));
    }, []);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    };

    return (
        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-pink-600/20 p-8 mb-6">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-pink-600/10 animate-gradient-x"></div>

            <div className="relative z-10">
                {/* Company Name */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                        <Building2 className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground gradient-text">
                            {companyName}
                        </h1>
                        <p className="text-sm text-muted-foreground">Management Information System Report</p>
                    </div>
                </div>

                {/* Report Metadata */}
                <div className="flex flex-wrap gap-6 mt-6 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                            Period: <span className="text-foreground font-semibold">
                                {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
                            </span>
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                            Generated: <span className="text-foreground font-semibold">{generatedTime}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
