"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#3b82f6", "#a855f7", "#f97316", "#eab308", "#06b6d4", "#ec4899", "#10b981", "#f59e0b"];

interface ExpenseData {
    name: string;
    value: number;
    color: string;
    [key: string]: string | number; // Index signature for Recharts compatibility
}

export function ExpenseChart() {
    const [data, setData] = useState<ExpenseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const today = new Date();
            const lastYear = new Date(today);
            lastYear.setFullYear(today.getFullYear() - 1);

            const startDate = lastYear.toISOString().split('T')[0];
            const endDate = today.toISOString().split('T')[0];

            const res = await fetch(`/api/qbo/reports/profit-and-loss?start_date=${startDate}&end_date=${endDate}`);

            if (res.status === 503) {
                setError('QuickBooks is temporarily unavailable. Chart will retry automatically.');
                // Retry after 5 seconds
                setTimeout(fetchData, 5000);
                return;
            }

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.details || 'Failed to fetch expense data');
            }

            const report = await res.json();
            processExpenseData(report);
        } catch (error: any) {
            console.error("Error fetching expense data:", error);
            setError(error.message || 'Failed to load expense data');
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const processExpenseData = (report: any) => {
        if (!report?.Rows?.Row) return;

        // Find the Expenses section
        const findSection = (rows: any[], sectionName: string): any => {
            for (const row of rows) {
                if (row.Header && row.Header.ColData && row.Header.ColData[0].value === sectionName) {
                    return row;
                }
                if (row.Rows && row.Rows.Row) {
                    const found: any = findSection(row.Rows.Row, sectionName);
                    if (found) return found;
                }
            }
            return null;
        };

        const expenseSection = findSection(report.Rows.Row, 'Expenses');

        if (!expenseSection || !expenseSection.Rows || !expenseSection.Rows.Row) {
            console.log("Expense Chart - No expense data found");
            return;
        }

        // Extract individual expense categories
        const expenseItems: ExpenseData[] = [];
        const rows = expenseSection.Rows.Row;

        rows.forEach((row: any, index: number) => {
            // Skip summary rows and only get actual expense line items
            if (row.ColData && row.ColData[0] && row.ColData[1]) {
                const name = row.ColData[0].value;
                const value = Math.abs(parseFloat(row.ColData[1].value) || 0);

                // Filter out "Total" rows and zero values
                if (name && !name.toLowerCase().includes('total') && value > 0) {
                    expenseItems.push({
                        name,
                        value,
                        color: COLORS[index % COLORS.length]
                    });
                }
            }
        });

        // Sort by value descending and take top 8
        const topExpenses = expenseItems
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);

        console.log("Expense Chart - Processed Data:", topExpenses);
        setData(topExpenses);
    };

    return (
        <Card className="glass border-white/10 hover-lift transition-smooth">
            <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">Expense Split</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full flex items-center justify-center">
                    {loading ? (
                        <div className="text-muted-foreground animate-pulse">Loading Chart Data...</div>
                    ) : error ? (
                        <div className="text-yellow-500 text-sm text-center px-4">
                            {error}
                        </div>
                    ) : data.length === 0 ? (
                        <div className="text-muted-foreground text-sm">No expense data available</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number | string | undefined) => `₹${Number(value || 0).toLocaleString('en-IN')}`}
                                    contentStyle={{
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        backdropFilter: 'blur(16px)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
                                        color: 'hsl(var(--foreground))'
                                    }}
                                />
                                <Legend
                                    layout="vertical"
                                    verticalAlign="middle"
                                    align="right"
                                    wrapperStyle={{ fontSize: '12px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
