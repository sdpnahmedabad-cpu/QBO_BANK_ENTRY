"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, RefreshCw, Mail } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell, LabelList } from "recharts";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { FinancialTable } from "@/components/reports/FinancialTable";
import { useStore } from "@/store/useStore";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#a78bfa', '#f472b6'];

export default function MISReportsPage() {
    const [pnlData, setPnlData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [companyName, setCompanyName] = useState<string>("Company");
    const [companyId, setCompanyId] = useState<string>("");

    const { selectedCompany } = useStore();

    // Email State
    const [isEmailOpen, setIsEmailOpen] = useState(false);
    const [clientEmail, setClientEmail] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [sendingEmail, setSendingEmail] = useState(false);

    // Initialize with Last Month
    useEffect(() => {
        const now = new Date();
        const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        setDateRange({
            start: firstDayPrevMonth.toISOString().split('T')[0],
            end: lastDayPrevMonth.toISOString().split('T')[0]
        });

        // Fetch company info for PDF
        fetch("/api/qbo/company-info")
            .then((res) => res.json())
            .then((data) => {
                const name = data.CompanyInfo?.CompanyName || data.companyName || "Company";
                setCompanyName(name);
            })
            .catch(() => setCompanyName("Company"));
    }, []);

    // Fetch and sync client email
    useEffect(() => {
        if (selectedCompany?.id) {
            setCompanyId(selectedCompany.id);
            setCompanyName(selectedCompany.name);

            fetch('/api/qbo/companies')
                .then(res => res.json())
                .then(companies => {
                    const match = companies.find((c: any) => c.id === selectedCompany.id);
                    if (match) {
                        setClientEmail(match.client_email || "");
                    }
                })
                .catch(err => console.error("Failed to fetch client email:", err));
        }
    }, [selectedCompany]);

    const fetchReports = () => {
        if (!dateRange.start || !dateRange.end) return;

        setLoading(true);
        const query = `?start_date=${dateRange.start}&end_date=${dateRange.end}`;

        fetch(`/api/qbo/reports/profit-and-loss${query}`)
            .then(res => res.json())
            .then(data => {
                setPnlData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("MIS Fetch Error:", err);
                setLoading(false);
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

    // Extract key metrics from P&L
    // Note: This relies on standard QBO P&L structure (Income, Expenses, Net Income)
    const getMetric = (rows: any[], groupName: string): number => {
        if (!rows) return 0;
        // Search recursively or at top level
        for (const row of rows) {
            if (row.group === groupName) {
                return parseFloat(row.Summary.ColData[1].value); // Assuming col 1 is value
            }
            if (row.Rows?.Row) {
                const found: number = getMetric(row.Rows.Row, groupName);
                if (found) return found;
            }
        }
        return 0;
    };

    // Simplification: Iterate top level rows to find "Income" and "Expenses" sections
    // --- Metric Calculation ---
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalCOGS = 0;
    let netIncome = 0;
    const expenseBreakdown: { name: string, value: number }[] = [];

    if (pnlData?.Rows?.Row) {
        const rows = pnlData.Rows.Row;
        rows.forEach((row: any) => {
            const group = row.group;
            const value = parseFloat(row.Summary?.ColData?.[1]?.value || "0");

            if (group === "Income") {
                totalIncome = value;
            }
            else if (group === "Cost of Goods Sold" || group === "COGS") {
                totalCOGS = value;
            }
            else if (group === "Expenses") {
                totalExpenses = value;

                // Extract top-level specific expenses for Pie Chart
                if (row.Rows?.Row) {
                    row.Rows.Row.forEach((subRow: any) => {
                        const subValStr = subRow.type === 'Section'
                            ? subRow.Summary?.ColData?.[1]?.value
                            : subRow.ColData?.[1]?.value;

                        const subVal = parseFloat(subValStr || "0");
                        const subName = subRow.type === 'Section'
                            ? (subRow.Header?.ColData?.[0]?.value || subRow.group)
                            : subRow.ColData?.[0]?.value;

                        if (subVal > 0 && subName) {
                            expenseBreakdown.push({ name: subName, value: subVal });
                        }
                    });
                }
            }
        });

        // Final Net Income check
        const lastRow = rows[rows.length - 1];
        if (lastRow?.group === "Net Income") {
            netIncome = parseFloat(lastRow.Summary?.ColData?.[1]?.value || "0");
        } else {
            netIncome = totalIncome - totalExpenses - totalCOGS; // Fallback
        }
    }

    // Sort and limit expense breakdown for Chart
    const topExpenses = expenseBreakdown
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5

    // Ratios
    const grossProfit = totalIncome - totalCOGS;
    const grossMargin = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;
    const netMargin = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;
    const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

    const chartData = [
        { name: "Income", amount: totalIncome },
        { name: "Expenses", amount: totalExpenses },
        { name: "Net Profit", amount: netIncome },
    ];

    const handleExport = async (returnBlob = false) => {
        if (!pnlData || !pnlData.Rows) {
            alert("No data available to export.");
            return;
        }

        try {
            setExporting(true);
            const doc = new jsPDF();

            // --- Header Section ---
            // Background for header
            doc.setFillColor(41, 128, 185); // Blue corporate color
            doc.rect(0, 0, 210, 40, 'F');

            // Company Name (White, Bold)
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text(companyName, 14, 15);

            // Report Title
            doc.setFontSize(16);
            doc.setFont("helvetica", "normal");
            doc.text("Management Information System (MIS) Report", 14, 25);

            // Period and Metadata
            doc.setFontSize(10);
            const periodStr = pnlData.Header?.StartPeriod ? `Period: ${pnlData.Header.StartPeriod} to ${pnlData.Header.EndPeriod}` : "";
            const generatedStr = `Generated: ${new Date().toLocaleString()}`;
            doc.text(periodStr, 14, 34);
            doc.text(generatedStr, 200, 34, { align: 'right' });

            // Reset Text Color
            doc.setTextColor(0, 0, 0);

            // --- Executive Summary Table ---
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Executive Summary", 14, 50);

            const currencySymbol = pnlData.Header?.Currency || "USD";
            const summaryData = [
                ["Metric", "Value"],
                ["Total Income", `${currencySymbol} ${totalIncome.toLocaleString()}`],
                ["Total Expenses", `${currencySymbol} ${totalExpenses.toLocaleString()}`],
                ["Net Profit", `${currencySymbol} ${netIncome.toLocaleString()}`],
                ["Gross Margin", `${grossMargin.toFixed(1)}%`],
                ["Net Margin", `${netMargin.toFixed(1)}%`],
                ["Expense Ratio", `${expenseRatio.toFixed(1)}%`]
            ];

            autoTable(doc, {
                startY: 55,
                head: [summaryData[0]],
                body: summaryData.slice(1),
                theme: 'grid',
                headStyles: { fillColor: [52, 73, 94], textColor: 255, fontStyle: 'bold' },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 100 },
                    1: { halign: 'right', fontStyle: 'bold' }
                },
                styles: { fontSize: 11, cellPadding: 5 },
                alternateRowStyles: { fillColor: [240, 240, 240] }
            });

            // --- Charts Capture ---
            const finalYSummary = (doc as any).lastAutoTable.finalY + 15;
            let currentY = finalYSummary;

            // Page break check
            if (currentY > 150) {
                doc.addPage();
                currentY = 20;
            }

            // Capture Bar Chart
            const barChartParams = document.getElementById('mis-chart-income-vs-expenses');
            if (barChartParams) {
                doc.setFontSize(14);
                doc.text("Financial Performance", 14, currentY);
                // Reduce scale and use JPEG to save space
                const canvas = await html2canvas(barChartParams, {
                    scale: 2,
                    backgroundColor: '#ffffff'
                });
                const imgData = canvas.toDataURL('image/jpeg', 0.8);
                const imgWidth = 180;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                doc.addImage(imgData, 'JPEG', 15, currentY + 5, imgWidth, imgHeight);
                currentY += imgHeight + 20;
            }

            // Capture Pie Chart
            const pieChartParams = document.getElementById('mis-chart-expense-breakdown');
            if (pieChartParams) {
                // Check page break
                if (currentY + 100 > 280) {
                    doc.addPage();
                    currentY = 20;
                }

                doc.setFontSize(14);
                doc.text("Expense Breakdown", 14, currentY);
                const canvas = await html2canvas(pieChartParams, {
                    scale: 2,
                    backgroundColor: '#ffffff'
                });
                const imgData = canvas.toDataURL('image/jpeg', 0.8);
                const imgWidth = 180;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                doc.addImage(imgData, 'JPEG', 15, currentY + 5, imgWidth, imgHeight);
                currentY += imgHeight + 25;
            }

            // --- Detailed Financial Table ---
            if (currentY > 250) {
                doc.addPage();
                currentY = 25;
            }

            doc.setFontSize(14);
            doc.text("Detailed Financial Breakdown", 14, currentY);

            const tableRows: any[] = [];

            // Helper to recursively flatten rows with hierarchy visuals
            const processRow = (row: any, indentLevel: number) => {
                const indent = "   ".repeat(indentLevel); // 3 spaces for PDF indent

                if (row.type === 'Section') {
                    const headerVal = row.Header?.ColData?.[0]?.value || row.group;
                    if (headerVal) {
                        tableRows.push([
                            { content: indent + headerVal, styles: { fontStyle: 'bold', fillColor: [230, 230, 240] } },
                            "",
                            ""
                        ]);
                    }
                    if (row.Rows?.Row) {
                        row.Rows.Row.forEach((subRow: any) => processRow(subRow, indentLevel + 1));
                    }
                    if (row.Summary) {
                        const sumLabel = row.Summary.ColData?.[0]?.value;
                        const sumValStr = row.Summary.ColData?.[row.Summary.ColData.length - 1]?.value;
                        const sumVal = parseFloat(sumValStr || "0");
                        // Calculate % of Income
                        const percent = totalIncome === 0 ? "0.0%" : ((sumVal / totalIncome) * 100).toFixed(1) + "%";

                        tableRows.push([
                            { content: indent + "TOTAL " + sumLabel, styles: { fontStyle: 'bold' } },
                            { content: `${currencySymbol} ${sumVal.toLocaleString()}`, styles: { fontStyle: 'bold', halign: 'right' } },
                            { content: percent, styles: { fontStyle: 'bold', halign: 'right' } }
                        ]);
                    }
                }
                else if (row.type === 'Data' && row.ColData) {
                    const label = row.ColData[0]?.value;
                    const valStr = row.ColData[row.ColData.length - 1]?.value;
                    const val = parseFloat(valStr || "0");
                    const percent = totalIncome === 0 ? "0.0%" : ((val / totalIncome) * 100).toFixed(1) + "%";

                    tableRows.push([
                        indent + label,
                        { content: `${currencySymbol} ${val.toLocaleString()}`, styles: { halign: 'right' } },
                        { content: percent, styles: { halign: 'right', textColor: [100, 100, 100] } }
                    ]);
                }
            };

            if (pnlData.Rows?.Row) {
                pnlData.Rows.Row.forEach((row: any) => processRow(row, 0));
            }

            autoTable(doc, {
                startY: currentY + 10,
                head: [['Particulars', 'Amount', '% of Income']],
                body: tableRows,
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 100 },
                    1: { cellWidth: 50, halign: 'right' },
                    2: { cellWidth: 30, halign: 'right' }
                },
                alternateRowStyles: { fillColor: [250, 250, 250] } // Subtle striping
            });

            // Footer
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Page ${i} of ${pageCount}`, 200, 290, { align: 'right' });
                doc.text(`Generated by Finza · ${new Date().toLocaleDateString()}`, 14, 290);
            }

            if (returnBlob) {
                setExporting(false);
                return doc.output('blob');
            }

            // Save PDF
            const dateStr = new Date().toISOString().split('T')[0];
            const safeCompanyName = companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            doc.save(`${safeCompanyName}_MIS_Report_${dateStr}.pdf`);

            setExporting(false);

        } catch (error: any) {
            console.error("Export failed:", error);
            alert("Export failed: " + (error.message || "Unknown error"));
            setExporting(false);
        }
    };

    const handleSendEmail = async () => {
        if (!clientEmail) {
            alert("Please enter a client email address");
            return;
        }

        setSendingEmail(true);

        try {
            // Update client email in DB
            if (companyId) {
                await fetch('/api/qbo/companies', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: companyId, client_email: clientEmail })
                });
            }

            // Generate PDF Blob
            const blob = await handleExport(true);
            if (!blob) {
                throw new Error("Failed to generate PDF");
            }

            // Convert Blob to Base64
            const reader = new FileReader();
            reader.readAsDataURL(blob as Blob);
            reader.onloadend = async () => {
                const base64String = (reader.result as string).split(',')[1];

                // Send Email as JSON
                const res = await fetch('/api/email/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: clientEmail,
                        subject: emailSubject,
                        body: emailBody,
                        fileBase64: base64String,
                        filename: `MIS_Report_${companyName.replace(/ /g, '_')}_${dateRange.start}_${dateRange.end}.pdf`
                    })
                });

                const result = await res.json();
                if (result.success) {
                    alert("Email sent successfully!");
                    setIsEmailOpen(false);
                } else {
                    alert("Failed to send email: " + result.error);
                }
                setSendingEmail(false);
            };

        } catch (e: any) {
            console.error("Email send failed", e);
            alert("Error sending email: " + e.message);
            setSendingEmail(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Report Header with Company Branding */}
            <ReportHeader dateRange={dateRange} />

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground gradient-text">Financial Analysis</h1>
                    <p className="text-muted-foreground">Performance Metrics & Insights</p>
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
                    <Button variant="outline" onClick={fetchReports} className="border-white/10 hover:bg-white/5 hover:text-primary"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>

                    {/* Email Button */}
                    <Dialog open={isEmailOpen} onOpenChange={setIsEmailOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-white/10 hover:bg-white/5 hover:text-primary" onClick={() => {
                                setEmailSubject(`MIS Report - ${companyName} - ${dateRange.start} to ${dateRange.end}`);
                                setEmailBody(`Dear Client,\n\nPlease find attached the MIS Report for ${companyName} covering the period from ${dateRange.start} to ${dateRange.end}.\n\nBest regards,\nFinza Reporting`);
                            }}>
                                <Mail className="mr-2 h-4 w-4" /> Mail
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Send MIS Report via Email</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Client Email</Label>
                                    <Input
                                        value={clientEmail}
                                        onChange={(e: any) => setClientEmail(e.target.value)}
                                        placeholder="client@example.com"
                                    />
                                    <p className="text-xs text-muted-foreground">This email will be saved for future reports.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Subject</Label>
                                    <Input
                                        value={emailSubject}
                                        onChange={(e: any) => setEmailSubject(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Message Body</Label>
                                    <textarea
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-white/10 bg-black/20 text-foreground"
                                        value={emailBody}
                                        onChange={(e) => setEmailBody(e.target.value)}
                                        rows={5}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEmailOpen(false)}>Cancel</Button>
                                <Button onClick={handleSendEmail} disabled={sendingEmail}>
                                    {sendingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {sendingEmail ? 'Sending...' : 'Send Report'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button variant="outline" onClick={() => handleExport(false)} disabled={loading || exporting} className="border-white/10 hover:bg-white/5 hover:text-primary">
                        {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {exporting ? 'Exporting...' : 'Export PDF'}
                    </Button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="glass border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500 shadow-green-500/20 drop-shadow-sm">
                            {pnlData?.Header?.Currency} {totalIncome.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500 shadow-red-500/20 drop-shadow-sm">
                            {pnlData?.Header?.Currency} {totalExpenses.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Ratio: {expenseRatio.toFixed(1)}%
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${netIncome >= 0 ? "text-blue-500 shadow-blue-500/20" : "text-red-500 shadow-red-500/20"} drop-shadow-sm`}>
                            {pnlData?.Header?.Currency} {netIncome.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Margin: {netMargin.toFixed(1)}%
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Gross Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {pnlData?.Header?.Currency} {grossProfit.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Margin: {grossMargin.toFixed(1)}%
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="glass border-white/10">
                    <CardHeader>
                        <CardTitle className="text-foreground">Income vs Expenses</CardTitle>
                        <CardDescription className="text-muted-foreground">Performance Overview with Exact Values</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] bg-transparent p-2" id="mis-chart-income-vs-expenses">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                        formatter={(value: any) => [`${pnlData?.Header?.Currency} ${Number(value).toLocaleString()}`, 'Amount']}
                                    />
                                    <Legend />
                                    <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.name === 'Income' ? '#22c55e' : entry.name === 'Net Profit' ? '#3b82f6' : '#ef4444'} />
                                        ))}
                                        <LabelList
                                            dataKey="amount"
                                            position="top"
                                            formatter={(value: any) => `${pnlData?.Header?.Currency} ${Number(value).toLocaleString()}`}
                                            style={{ fill: '#fff', fontWeight: 'bold', fontSize: '12px' }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass border-white/10">
                    <CardHeader>
                        <CardTitle className="text-foreground">Expense Breakdown</CardTitle>
                        <CardDescription className="text-muted-foreground">Top Categories with Exact Percentages</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] bg-transparent p-2" id="mis-chart-expense-breakdown">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={topExpenses}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={{ stroke: '#888', strokeWidth: 1 }}
                                        label={({ name, percent, value }) => {
                                            const percentage = ((percent || 0) * 100).toFixed(1);
                                            const amount = Number(value).toLocaleString();
                                            return `${name}: ${percentage}% (${pnlData?.Header?.Currency} ${amount})`;
                                        }}
                                        outerRadius={90}
                                        fill="#8884d8"
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {topExpenses.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: any) => [`${pnlData?.Header?.Currency} ${Number(value).toLocaleString()}`, 'Amount']}
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    />
                                    <Legend
                                        formatter={(value, entry: any) => {
                                            const total = topExpenses.reduce((sum, item) => sum + item.value, 0);
                                            const percentage = ((entry.payload.value / total) * 100).toFixed(1);
                                            return `${value} (${percentage}%)`;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Financial Table */}
            <FinancialTable
                data={pnlData}
                currency={pnlData?.Header?.Currency || "USD"}
                totalIncome={totalIncome}
            />
        </div>
    );
}
