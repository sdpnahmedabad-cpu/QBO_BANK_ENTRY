"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from "lucide-react";

interface KPIItemProps {
    title: string;
    value: string;
    trend: string;
    trendUp: boolean;
    icon: any;
    description: string;
}

// Default/Initial Data
const INITIAL_KPI_DATA: KPIItemProps[] = [
    {
        title: "Total Bank Balance",
        value: "Loading...",
        trend: "--",
        trendUp: true,
        icon: Wallet,
        description: "Across all connected banks"
    },
    {
        title: "Cash Inflow",
        value: "Loading...",
        trend: "--",
        trendUp: true,
        icon: ArrowDownRight,
        description: "Revenue & Collections"
    },
    {
        title: "Cash Outflow",
        value: "Loading...",
        trend: "--",
        trendUp: true,
        icon: ArrowUpRight,
        description: "Expenses & Payments"
    },
    {
        title: "Net Cash Position",
        value: "Loading...",
        trend: "--",
        trendUp: true,
        icon: TrendingUp,
        description: "Surplus for the period"
    }
];

export function KPICards() {
    const [kpiData, setKpiData] = useState<KPIItemProps[]>(INITIAL_KPI_DATA);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch bank balance
            const bankRes = await fetch('/api/qbo/accounts?type=Bank');
            let totalBalance = 0;

            if (bankRes.ok) {
                const bankData = await bankRes.json();
                // API returns the array directly now, but let's handle both cases just in case
                const accounts = Array.isArray(bankData) ? bankData : (bankData.QueryResponse?.Account || []);
                totalBalance = accounts.reduce((sum: number, acc: any) => sum + (parseFloat(acc.CurrentBalance) || 0), 0);
            }

            // Fetch Profit & Loss for LAST 12 MONTHS (to catch Sandbox data)
            const today = new Date();
            const lastYear = new Date(today);
            lastYear.setFullYear(today.getFullYear() - 1); // Go back 1 year

            const startDate = lastYear.toISOString().split('T')[0];
            const endDate = today.toISOString().split('T')[0];

            const plRes = await fetch(`/api/qbo/reports/profit-and-loss?start_date=${startDate}&end_date=${endDate}`);

            let totalIncome = 0;
            let totalExpenses = 0;

            if (plRes.ok) {
                const plData = await plRes.json();

                // Parse QuickBooks P&L report structure
                const rows = plData?.Rows?.Row || [];

                // Find Income and Expenses sections
                rows.forEach((row: any) => {
                    if (row.group === 'Income' || row.Header?.ColData?.[0]?.value === 'Total Income') {
                        const summary = row.Summary?.ColData?.[1]?.value;
                        if (summary) totalIncome = parseFloat(summary) || 0;
                    }
                    if (row.group === 'Expenses' || row.Header?.ColData?.[0]?.value === 'Total Expenses') {
                        const summary = row.Summary?.ColData?.[1]?.value;
                        if (summary) totalExpenses = Math.abs(parseFloat(summary) || 0);
                    }
                });
            }

            const netPosition = totalIncome - totalExpenses;

            const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0
            }).format(value);

            setKpiData(prev => {
                const newData = [...prev];
                newData[0] = {
                    ...newData[0],
                    value: formatCurrency(totalBalance),
                    trend: "Live Data",
                };
                newData[1] = {
                    ...newData[1],
                    value: formatCurrency(totalIncome),
                    trend: "This Month",
                };
                newData[2] = {
                    ...newData[2],
                    value: formatCurrency(totalExpenses),
                    trend: "This Month",
                };
                newData[3] = {
                    ...newData[3],
                    value: formatCurrency(netPosition),
                    trend: netPosition >= 0 ? "Surplus" : "Deficit",
                    trendUp: netPosition >= 0,
                };
                return newData;
            });
        } catch (error) {
            console.error("Failed to fetch KPI data", error);
        } finally {
            setLoading(false);
        }
    };

    const gradients = [
        "from-blue-500 to-purple-600",
        "from-green-500 to-emerald-600",
        "from-orange-500 to-red-600",
        "from-purple-500 to-pink-600"
    ];

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {kpiData.map((item, index) => (
                <Card
                    key={index}
                    className="glass border-white/10 hover-lift transition-smooth overflow-hidden relative group stagger-item"
                    style={{ animationDelay: `${index * 0.1}s` }}
                >
                    {/* Gradient border */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradients[index]} opacity-0 group-hover:opacity-10 transition-smooth`} />
                    <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${gradients[index]}`} />

                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {item.title}
                        </CardTitle>
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${gradients[index]} opacity-80 group-hover:opacity-100 transition-smooth`}>
                            <item.icon className="h-4 w-4 text-white" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-foreground mb-1">
                            {loading ? (
                                <span className="animate-pulse text-muted-foreground text-2xl">Loading...</span>
                            ) : (
                                item.value
                            )}
                        </div>
                        <p className={`text-xs font-medium flex items-center mt-1 ${item.trendUp ? 'text-green-400' : 'text-red-400'}`}>
                            {item.trend}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">{item.description}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
