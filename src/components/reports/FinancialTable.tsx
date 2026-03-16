"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FinancialRow {
    type: string;
    group?: string;
    Header?: any;
    Summary?: any;
    ColData?: any[];
    Rows?: { Row: any[] };
}

interface FinancialTableProps {
    data: any;
    currency: string;
    totalIncome: number;
}

export function FinancialTable({ data, currency, totalIncome }: FinancialTableProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

    const toggleSection = (key: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(key)) {
            newExpanded.delete(key);
        } else {
            newExpanded.add(key);
        }
        setExpandedSections(newExpanded);
    };

    const formatCurrency = (value: number) => {
        return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const calculatePercentage = (value: number) => {
        if (totalIncome === 0) return "0.0";
        return ((value / totalIncome) * 100).toFixed(1);
    };

    const renderRow = (row: FinancialRow, level: number = 0, parentKey: string = "") => {
        const key = `${parentKey}-${row.group || row.type}-${level}`;
        const isExpanded = expandedSections.has(key);
        const hasChildren = row.Rows?.Row && row.Rows.Row.length > 0;

        if (row.type === "Section") {
            const headerText = row.Header?.ColData?.[0]?.value || row.group || "";
            const summaryValue = parseFloat(row.Summary?.ColData?.[1]?.value || "0");
            const percentage = calculatePercentage(summaryValue);

            return (
                <div key={key}>
                    {/* Section Header */}
                    <div
                        className={`flex items-center justify-between p-3 hover:bg-white/5 cursor-pointer transition-colors ${level === 0 ? "bg-white/10 font-bold" : ""
                            }`}
                        style={{ paddingLeft: `${level * 1.5 + 1}rem` }}
                        onClick={() => hasChildren && toggleSection(key)}
                    >
                        <div className="flex items-center gap-2 flex-1">
                            {hasChildren && (
                                isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                            )}
                            <span className={level === 0 ? "text-base font-bold" : "font-semibold"}>
                                {headerText}
                            </span>
                        </div>
                        <div className="flex gap-8 items-center">
                            <span className={`font-mono ${level === 0 ? "font-bold text-base" : ""}`}>
                                {formatCurrency(summaryValue)}
                            </span>
                            <span className={`text-muted-foreground w-16 text-right ${level === 0 ? "font-bold" : ""}`}>
                                {percentage}%
                            </span>
                        </div>
                    </div>

                    {/* Children */}
                    {hasChildren && isExpanded && row.Rows?.Row && (
                        <div>
                            {row.Rows.Row.map((subRow: any, idx: number) =>
                                renderRow(subRow, level + 1, key + idx)
                            )}
                        </div>
                    )}
                </div>
            );
        } else if (row.type === "Data" && row.ColData) {
            const label = row.ColData[0]?.value || "";
            const value = parseFloat(row.ColData[row.ColData.length - 1]?.value || "0");
            const percentage = calculatePercentage(value);

            return (
                <div
                    key={key}
                    className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors border-b border-white/5"
                    style={{ paddingLeft: `${level * 1.5 + 1}rem` }}
                >
                    <span className="text-sm">{label}</span>
                    <div className="flex gap-8 items-center">
                        <span className="font-mono text-sm">{formatCurrency(value)}</span>
                        <span className="text-muted-foreground text-sm w-16 text-right">{percentage}%</span>
                    </div>
                </div>
            );
        }

        return null;
    };

    if (!data?.Rows?.Row) {
        return (
            <Card className="glass border-white/10">
                <CardContent className="p-6">
                    <p className="text-muted-foreground text-center">No detailed data available</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="glass border-white/10">
            <CardHeader>
                <CardTitle className="text-foreground">Detailed Financial Breakdown</CardTitle>
                <p className="text-sm text-muted-foreground">Click on sections to expand/collapse</p>
            </CardHeader>
            <CardContent className="p-0">
                {/* Table Header */}
                <div className="flex items-center justify-between p-3 bg-white/10 border-b border-white/10 font-semibold">
                    <span>Particulars</span>
                    <div className="flex gap-8 items-center">
                        <span className="w-32 text-right">Amount</span>
                        <span className="w-16 text-right">% of Income</span>
                    </div>
                </div>

                {/* Table Body */}
                <div className="max-h-[600px] overflow-y-auto">
                    {data.Rows.Row.map((row: any, idx: number) => renderRow(row, 0, `root-${idx}`))}
                </div>
            </CardContent>
        </Card>
    );
}
