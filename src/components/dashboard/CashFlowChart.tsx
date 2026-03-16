"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CashFlowChart() {
    const [data, setData] = useState<any[]>([]);
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
            lastYear.setMonth(today.getMonth() - 11); // Last 12 months including current
            lastYear.setDate(1); // Start from 1st

            const startDate = lastYear.toISOString().split('T')[0];
            const endDate = today.toISOString().split('T')[0];

            // Request monthly summary
            const res = await fetch(`/api/qbo/reports/profit-and-loss?start_date=${startDate}&end_date=${endDate}&summarize_column_by=Month`);

            if (res.status === 503) {
                setError('QuickBooks is temporarily unavailable. Chart will retry automatically.');
                // Retry after 5 seconds
                setTimeout(fetchData, 5000);
                return;
            }

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.details || 'Failed to fetch data');
            }

            const report = await res.json();
            processReportData(report);
        } catch (error: any) {
            console.error("Error fetching cash flow data:", error);
            setError(error.message || 'Failed to load chart data');
        } finally {
            setLoading(false);
        }
    };

    const processReportData = (report: any) => {
        if (!report?.Columns?.Column || !report?.Rows?.Row) {
            console.log("Chart Debug - Missing Columns or Rows");
            return;
        }

        const columns = report.Columns.Column;
        console.log("Chart Debug - Total Columns:", columns.length);

        // Map column indices to labels (Month names)
        const timeColumns: { index: number, label: string }[] = [];
        columns.forEach((col: any, index: number) => {
            // For monthly reports, columns have ColType: "Money" with month names as ColTitle
            // Skip the first column (Account) and the Total column
            if (col.ColType === 'Money' && col.ColTitle && col.ColTitle !== 'Total') {
                timeColumns.push({ index, label: col.ColTitle });
                console.log(`Chart Debug - Found time column: ${col.ColTitle} at index ${index}`);
            }
        });

        console.log("Chart Debug - Time Columns Found:", timeColumns.length);

        // Initialize data map
        const monthlyData = timeColumns.map(col => ({
            name: col.label.split(' ')[0], // Just Month name
            fullLabel: col.label,
            inflow: 0,
            outflow: 0
        }));

        // We can also just iterate top level groups usually: 'Income' and 'Expenses'
        const rows = report.Rows.Row;

        // Recursive helper to find sections by name (Income, Expenses)
        const findSection = (rows: any[], sectionName: string): any => {
            for (const row of rows) {
                // Check if this is a section header
                if (row.Header && row.Header.ColData && row.Header.ColData[0].value === sectionName) {
                    return row;
                }
                // Recurse into nested rows
                if (row.Rows && row.Rows.Row) {
                    const found: any = findSection(row.Rows.Row, sectionName);
                    if (found) return found;
                }
            }
            return null;
        };

        const incomeSection = findSection(rows, 'Income');
        const expenseSection = findSection(rows, 'Expenses');

        console.log("Chart Debug - Income Section:", incomeSection ? "Found" : "Not Found");
        console.log("Chart Debug - Expense Section:", expenseSection ? "Found" : "Not Found");

        // Extract summary data from sections
        let incomeRow = null;
        let expenseRow = null;

        if (incomeSection && incomeSection.Summary) {
            incomeRow = incomeSection.Summary;
            console.log("Chart Debug - Using Income Summary");
        }

        if (expenseSection && expenseSection.Summary) {
            expenseRow = expenseSection.Summary;
            console.log("Chart Debug - Using Expense Summary");
        }

        // Map values
        if (incomeRow || expenseRow) {
            monthlyData.forEach((item, i) => {
                const colIndex = timeColumns[i].index;

                if (incomeRow && incomeRow.ColData && incomeRow.ColData[colIndex]) {
                    item.inflow = parseFloat(incomeRow.ColData[colIndex].value) || 0;
                }
                if (expenseRow && expenseRow.ColData && expenseRow.ColData[colIndex]) {
                    item.outflow = Math.abs(parseFloat(expenseRow.ColData[colIndex].value)) || 0;
                }
            });
        }

        console.log("Chart Debug - Processed Monthly Data:", monthlyData);
        setData(monthlyData);
    };

    return (
        <Card className="glass border-white/10 hover-lift transition-smooth">
            <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">Cash Flow Trends</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <div className="h-[300px] w-full flex items-center justify-center">
                    {loading ? (
                        <div className="text-muted-foreground animate-pulse">Loading Chart Data...</div>
                    ) : error ? (
                        <div className="text-yellow-500 text-sm text-center px-4">
                            {error}
                        </div>
                    ) : data.length === 0 ? (
                        <div className="text-muted-foreground text-sm">No data available</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="name"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `₹${value / 1000}k`}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        backdropFilter: 'blur(16px)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
                                        color: 'hsl(var(--foreground))'
                                    }}
                                    formatter={(value: number | string | undefined) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, '']}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                                <Bar dataKey="inflow" name="Cash Inflow" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} barSize={30} />
                                <Bar dataKey="outflow" name="Cash Outflow" fill="hsl(25, 95%, 53%)" radius={[6, 6, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
