"use client";

import { useState, useEffect, Fragment } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function FinancialStatementsPage() {
    const [pnlData, setPnlData] = useState<any>(null);
    const [bsData, setBsData] = useState<any>(null);
    const [loadingPnl, setLoadingPnl] = useState(false);
    const [loadingBs, setLoadingBs] = useState(false);
    const [activeTab, setActiveTab] = useState("pnl");
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Initialize with Last Month
    useEffect(() => {
        const now = new Date();
        const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        setDateRange({
            start: firstDayPrevMonth.toISOString().split('T')[0],
            end: lastDayPrevMonth.toISOString().split('T')[0]
        });
    }, []);

    const fetchReports = () => {
        if (!dateRange.start || !dateRange.end) return;

        setLoadingPnl(true);
        setLoadingBs(true);

        const query = `?start_date=${dateRange.start}&end_date=${dateRange.end}`;

        Promise.all([
            fetch(`/api/qbo/reports/profit-and-loss${query}`).then(res => res.json()),
            fetch(`/api/qbo/reports/balance-sheet${query}`).then(res => res.json())
        ]).then(([pnl, bs]) => {
            setPnlData(pnl);
            setBsData(bs);
            setLoadingPnl(false);
            setLoadingBs(false);
        }).catch(err => {
            console.error("Error fetching reports:", err);
            setLoadingPnl(false);
            setLoadingBs(false);
        });
    };

    useEffect(() => {
        if (dateRange.start && dateRange.end) {
            const handler = setTimeout(() => {
                fetchReports();
            }, 3000);

            return () => {
                clearTimeout(handler);
            };
        }
    }, [dateRange]);

    const handleExport = () => {
        try {
            const data = activeTab === "pnl" ? pnlData : bsData;
            const title = activeTab === "pnl" ? "Profit & Loss" : "Balance Sheet";

            if (!data || !data.Rows) {
                alert("No data available to export.");
                return;
            }

            const doc = new jsPDF();
            const currencySymbol = data.Header?.Currency || "USD";

            // Helper to format currency
            const formatCurrency = (val: string | number) => {
                if (!val) return "";
                const num = typeof val === 'string' ? parseFloat(val) : val;
                if (isNaN(num)) return val.toString();
                return new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(num);
            };

            // --- Header ---
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            // Placeholder for Company Name - normally from settings or data
            doc.text("QBO Company Name", 105, 15, { align: "center" });

            doc.setFontSize(14);
            doc.setFont("helvetica", "normal");
            doc.text(data.Header?.ReportName || title, 105, 22, { align: "center" });

            doc.setFontSize(10);
            doc.setTextColor(100);
            if (data.Header?.StartPeriod && data.Header?.EndPeriod) {
                doc.text(`Period: ${data.Header.StartPeriod} to ${data.Header.EndPeriod}`, 105, 28, { align: "center" });
            }
            // Currency indicator
            doc.text(`Currency: ${currencySymbol}`, 195, 35, { align: "right" });
            doc.setTextColor(0);

            const tableRows: any[] = [];

            // Recursive function to flatten QBO data for PDF
            const processRow = (row: any, indentLevel: number) => {
                const indent = "    ".repeat(indentLevel); // 4 spaces for cleaner look

                if (row.type === 'Section') {
                    // Section Header
                    const headerVal = row.Header?.ColData?.[0]?.value || row.group;
                    if (headerVal) {
                        tableRows.push([
                            { content: indent + headerVal, styles: { fontStyle: 'bold', minCellHeight: 9 } },
                            ""
                        ]);
                    }

                    // Recursive rows
                    if (row.Rows?.Row) {
                        row.Rows.Row.forEach((subRow: any) => processRow(subRow, indentLevel + 1));
                    }

                    // Section Summary
                    if (row.Summary) {
                        const sumLabel = row.Summary.ColData?.[0]?.value;
                        const sumVal = row.Summary.ColData?.[row.Summary.ColData.length - 1]?.value;
                        tableRows.push([
                            { content: indent + "TOTAL " + sumLabel, styles: { fontStyle: 'bold', fillColor: [250, 250, 250] } },
                            { content: formatCurrency(sumVal), styles: { fontStyle: 'bold', halign: 'right', fillColor: [250, 250, 250] } }
                        ]);
                    }
                }
                else if (row.type === 'Data' && row.ColData) {
                    const label = row.ColData[0]?.value;
                    const val = row.ColData[row.ColData.length - 1]?.value;
                    tableRows.push([
                        indent + label,
                        { content: formatCurrency(val), styles: { halign: 'right' } }
                    ]);
                }
            };

            if (data.Rows?.Row) {
                data.Rows.Row.forEach((row: any) => processRow(row, 0));
            }

            // Detailed table
            autoTable(doc, {
                startY: 40,
                head: [['Particulars', `Amount (${currencySymbol})`]],
                body: tableRows,
                theme: 'plain', // Clean look
                styles: {
                    fontSize: 10,
                    cellPadding: 3,
                    lineColor: [200, 200, 200],
                    lineWidth: 0.1,
                },
                headStyles: {
                    fillColor: [50, 50, 50],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles: {
                    0: { cellWidth: 140 },
                    1: { cellWidth: 40, halign: 'right' }
                },
                didDrawPage: function (data) {
                    // Footer
                    const str = 'Page ' + (doc as any).internal.getNumberOfPages();
                    doc.setFontSize(8);
                    const pageSize = doc.internal.pageSize;
                    const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                    doc.text(str, data.settings.margin.left, pageHeight - 10);
                }
            });

            // Save PDF
            const dateStr = new Date().toISOString().split('T')[0];
            const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
            doc.save(`${cleanTitle}_${dateStr}.pdf`);

        } catch (error: any) {
            console.error("Export failed:", error);
            alert(`Export failed: ${error.message || "Unknown error"}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground gradient-text">Financial Statements</h1>
                    <p className="text-muted-foreground">Balance Sheet & Profit/Loss</p>
                </div>
                <div className="flex gap-2 items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">From:</span>
                        <input
                            type="date"
                            className="border border-white/10 rounded px-2 py-1 text-sm bg-black/20 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        />
                        <span className="text-sm text-muted-foreground">To:</span>
                        <input
                            type="date"
                            className="border border-white/10 rounded px-2 py-1 text-sm bg-black/20 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        />
                    </div>
                    <Button variant="outline" onClick={fetchReports} className="border-white/10 hover:bg-white/5 hover:text-primary">
                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                    <Button variant="outline" onClick={handleExport} disabled={loadingPnl || loadingBs} className="border-white/10 hover:bg-white/5 hover:text-primary">
                        <Download className="mr-2 h-4 w-4" /> Export PDF
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(val) => {
                setActiveTab(val);
                if (!pnlData || !bsData) fetchReports();
            }} className="w-full">
                <TabsList className="bg-black/20 border border-white/10">
                    <TabsTrigger value="pnl" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Profit & Loss</TabsTrigger>
                    <TabsTrigger value="bs" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Balance Sheet</TabsTrigger>
                </TabsList>

                <TabsContent value="pnl" className="mt-6">
                    <ReportResultView
                        data={pnlData}
                        loading={loadingPnl}
                        title="Profit & Loss"
                        onRetry={fetchReports}
                    />
                </TabsContent>

                <TabsContent value="bs" className="mt-6">
                    <ReportResultView
                        data={bsData}
                        loading={loadingBs}
                        title="Balance Sheet"
                        onRetry={fetchReports}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function ReportResultView({ data, loading, title, onRetry }: { data: any, loading: boolean, title: string, onRetry: () => void }) {
    if (loading) {
        return (
            <Card className="glass border-white/10">
                <CardContent className="flex flex-col items-center justify-center p-12 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Fetching {title}...</p>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.error) {
        return (
            <Card className="glass border-white/10">
                <CardContent className="flex flex-col items-center justify-center p-12 space-y-4">
                    <p className="text-destructive font-medium">Failed to load {title}</p>
                    {data?.error && <p className="text-sm text-muted-foreground">{data.details || data.error}</p>}
                    <Button variant="outline" onClick={onRetry} className="border-white/10 hover:bg-white/5">Try Again</Button>
                </CardContent>
            </Card>
        );
    }

    // Header Info
    const reportName = data.Header?.ReportName || title;
    const period = `For ${data.Header?.StartPeriod} to ${data.Header?.EndPeriod}`;
    const currency = data.Header?.Currency || "USD";

    // Recursively render rows
    const renderRows = (rows: any[], level = 0) => {
        if (!rows) return null;
        return rows.map((row: any, i: number) => {
            // Section
            if (row.type === 'Section') {
                return (
                    <Fragment key={`section-${i}`}>
                        <TableRow className={`font-semibold bg-white/5 hover:bg-white/10 border-white/5`}>
                            <TableCell style={{ paddingLeft: `${(level) * 20 + 20}px` }} className="text-foreground">
                                {row.Header?.ColData?.[0]?.value || row.group}
                            </TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                        {row.Rows?.Row && renderRows(row.Rows.Row, level + 1)}
                        {row.Summary && (
                            <TableRow className="font-bold border-t border-white/10 bg-white/5">
                                <TableCell style={{ paddingLeft: `${(level) * 20 + 20}px` }} className="text-foreground">
                                    {row.Summary.ColData?.[0]?.value}
                                </TableCell>
                                <TableCell className="text-right text-foreground">
                                    {row.Summary.ColData?.[row.Summary.ColData.length - 1]?.value}
                                </TableCell>
                            </TableRow>
                        )}
                    </Fragment>
                );
            }
            // Data Row
            if (row.type === 'Data' && row.ColData) {
                return (
                    <TableRow key={`data-${i}`} className="hover:bg-white/5 border-white/5">
                        <TableCell style={{ paddingLeft: `${(level) * 20 + 20}px` }} className="text-muted-foreground">
                            {row.ColData[0]?.value}
                        </TableCell>
                        <TableCell className="text-right text-foreground font-medium">
                            {row.ColData[row.ColData.length - 1]?.value}
                        </TableCell>
                    </TableRow>
                );
            }
            return null;
        });
    };

    return (
        <Card className="glass border-white/10">
            <CardHeader>
                <CardTitle className="text-foreground">{reportName}</CardTitle>
                <CardDescription className="text-muted-foreground">{period}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="w-[60%] text-muted-foreground">Particulars</TableHead>
                            <TableHead className="text-right text-muted-foreground">Amount ({currency})</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.Rows?.Row ? renderRows(data.Rows.Row) : (
                            <TableRow className="border-white/5">
                                <TableCell colSpan={2} className="text-center p-8 text-muted-foreground">No data available for this period.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
