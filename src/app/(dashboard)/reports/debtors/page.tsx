"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QBOProtected } from "@/components/qbo/QBOProtected";
import { Loader2, RefreshCcw, FileText, FileSpreadsheet, Download, Mail, Send, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DebtorsPage() {
    return (
        <QBOProtected>
            <DebtorsContent />
        </QBOProtected>
    );
}

// ─── Email Dialog Component ───────────────────────────────────────────────────
interface EmailDialogProps {
    open: boolean;
    onClose: () => void;
    customerName: string;
    totalAmount: string;
    companyName: string;
}

function EmailDialog({ open, onClose, customerName, totalAmount, companyName }: EmailDialogProps) {
    const [to, setTo] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetchingEmail, setFetchingEmail] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    // Fetch customer email from QBO and set defaults when dialog opens
    useEffect(() => {
        if (!open) {
            // Reset state when dialog closes
            setStatus("idle");
            setErrorMsg("");
            return;
        }

        // Set default subject & body
        setSubject(`Payment Reminder – ${companyName}`);
        setBody(
            `Dear ${customerName},\n\n` +
            `This is a friendly reminder that you have an outstanding balance of ${totalAmount} with ${companyName}.\n\n` +
            `We kindly request you to arrange payment at your earliest convenience.\n\n` +
            `If you have already made the payment, please disregard this email.\n\n` +
            `Thank you for your prompt attention to this matter.\n\n` +
            `Best regards,\n${companyName}`
        );

        // Fetch email from QBO
        setFetchingEmail(true);
        setTo(""); // Reset while loading
        fetch(`/api/qbo/customer-email?name=${encodeURIComponent(customerName)}`)
            .then(res => res.json())
            .then(data => {
                setTo(data.email || "");
            })
            .catch(() => {
                setTo("");
            })
            .finally(() => setFetchingEmail(false));
    }, [open, customerName, totalAmount, companyName]);

    const handleSend = async () => {
        if (!to) {
            setErrorMsg("Please enter the recipient email address.");
            return;
        }

        setLoading(true);
        setStatus("idle");
        setErrorMsg("");

        try {
            const res = await fetch("/api/email/send-reminder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to, subject, body }),
            });
            const data = await res.json();
            if (data.success) {
                setStatus("success");
                // Auto-close after 2s on success
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                setStatus("error");
                setErrorMsg(data.error || "Failed to send email");
            }
        } catch (err: any) {
            setStatus("error");
            setErrorMsg(err.message || "Network error");
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Dialog */}
            <div className="relative w-full max-w-lg mx-4 bg-card border border-white/10 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Send Payment Reminder</h3>
                            <p className="text-xs text-muted-foreground">to {customerName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* To */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">To (Email)</label>
                        <div className="relative">
                            <input
                                type="email"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                placeholder={fetchingEmail ? "Fetching from QBO..." : "Enter email address"}
                                className="w-full px-3 py-2 pr-8 text-sm rounded-lg border border-white/10 bg-black/20 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                                disabled={fetchingEmail}
                            />
                            {fetchingEmail && (
                                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                        </div>
                        {!fetchingEmail && !to && (
                            <p className="text-xs text-amber-500/80">No email found in QBO — please enter manually.</p>
                        )}
                    </div>

                    {/* Subject */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Subject</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-black/20 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    {/* Body */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Message</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={8}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-black/20 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        />
                    </div>

                    {/* Outstanding amount badge */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                        <span className="text-xs text-muted-foreground">Outstanding Amount:</span>
                        <span className="text-sm font-bold text-primary">{totalAmount}</span>
                    </div>

                    {/* Error message */}
                    {errorMsg && (
                        <div className="px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {errorMsg}
                        </div>
                    )}

                    {/* Success message */}
                    {status === "success" && (
                        <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                            ✓ Email sent successfully to {to}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
                    <Button variant="outline" size="sm" onClick={onClose} className="border-white/10">
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSend}
                        disabled={loading || status === "success"}
                        className="gap-2 bg-primary hover:bg-primary/90"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Sending...
                            </>
                        ) : status === "success" ? (
                            <>Sent ✓</>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                Send Reminder
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Debtors Content ─────────────────────────────────────────────────────
function DebtorsContent() {
    const [date, setDate] = useState<Date>(new Date());
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isAutoRefresh, setIsAutoRefresh] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [companyName, setCompanyName] = useState<string>("Company Name");

    // Email dialog state
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState({ name: "", total: "" });

    const fetchReport = (selectedDate: Date) => {
        setLoading(true);
        const dateStr = selectedDate.toISOString().split('T')[0];
        const url = `/api/qbo/reports/aged-receivables?date=${dateStr}`;
        console.log(`[Client] Fetching report from: ${url}`);
        fetch(url, { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                setReportData(data);
                setLoading(false);
                setLastUpdated(new Date());
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    // Fetch Company Info
    useEffect(() => {
        fetch('/api/qbo/company-info')
            .then(res => res.json())
            .then(data => {
                if (data.CompanyInfo && data.CompanyInfo.CompanyName) {
                    setCompanyName(data.CompanyInfo.CompanyName);
                }
            })
            .catch(err => console.error("Failed to fetch company info", err));
    }, []);

    // Initial Fetch
    useEffect(() => {
        fetchReport(date);
    }, []); // Run once on mount

    // Auto Refresh Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isAutoRefresh) {
            interval = setInterval(() => {
                fetchReport(date);
            }, 5000); // 5 seconds interval
        }
        return () => clearInterval(interval);
    }, [isAutoRefresh, date]);

    const handleRefresh = () => {
        fetchReport(date);
    };

    const handleDateSelect = (newDate: Date | undefined) => {
        if (newDate) {
            setDate(newDate);
            fetchReport(newDate);
        }
    };

    const handleSendEmail = (customerName: string, totalAmount: string) => {
        setSelectedCustomer({ name: customerName, total: totalAmount });
        setEmailDialogOpen(true);
    };

    const handleExportPDF = () => {
        if (!reportData || !reportData.Rows) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // --- Header ---
        doc.setFillColor(30, 58, 138); // Dark Blue
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text(companyName, pageWidth / 2, 15, { align: "center" });

        doc.setFontSize(16);
        doc.setFont("helvetica", "normal");
        doc.text("Debtors Ageing Report", pageWidth / 2, 25, { align: "center" });

        doc.setFontSize(10);
        doc.text(`As of: ${format(date, "dd MMMM yyyy")}`, pageWidth / 2, 35, { align: "center" });

        // --- Metadata Wrapper ---
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.text(`Generated on: ${format(new Date(), "PPpp")}`, 14, 45);

        // --- Table Data Preparation ---
        const columns = reportData.Columns.Column.map((col: any) => col.ColTitle);
        const rows = reportData.Rows.Row.map((row: any) => {
            if (!row.ColData) return [];
            return row.ColData.map((cell: any) => cell.value);
        }).filter((r: any) => r.length > 0);

        // --- AutoTable ---
        autoTable(doc, {
            startY: 50,
            head: [columns],
            body: rows,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 58, 138],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: {
                textColor: [50, 50, 50],
                fontSize: 9
            },
            alternateRowStyles: {
                fillColor: [245, 247, 250]
            },
            footStyles: {
                fillColor: [240, 240, 240],
                textColor: [0, 0, 0],
                fontStyle: 'bold'
            },
            margin: { top: 50 },
        });

        // --- Footer ---
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, doc.internal.pageSize.height - 10);
        }

        doc.save(`${companyName.replace(/ /g, "_")}_Debtors_Ageing_${format(date, "yyyy-MM-dd")}.pdf`);
    };

    const handleExportExcel = () => {
        if (!reportData || !reportData.Rows) return;

        const wb = XLSX.utils.book_new();

        const headers = reportData.Columns.Column.map((col: any) => col.ColTitle);
        const dataRows = reportData.Rows.Row.map((row: any) => {
            if (!row.ColData) return [];
            return row.ColData.map((cell: any) => cell.value);
        }).filter((r: any) => r.length > 0);

        const wsData = [
            [companyName],
            ["Debtors Ageing Report"],
            [`As of: ${format(date, "dd MMMM yyyy")}`],
            [], // Spacer
            headers,
            ...dataRows
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Styling (Basic column widths)
        const wscols = headers.map(() => ({ wch: 20 }));
        // First column wider for customer names
        wscols[0] = { wch: 40 };
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "Debtors Ageing");
        XLSX.writeFile(wb, `${companyName.replace(/ /g, "_")}_Debtors_Ageing_${format(date, "yyyy-MM-dd")}.xlsx`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative">
                {/* Title Section */}
                <div className="w-full sm:w-auto text-center sm:text-left">
                    <h1 className="text-2xl font-bold text-foreground gradient-text">Debtors Ageing</h1>
                    <p className="text-muted-foreground flex items-center gap-2 text-xs">
                        Outstanding Receivables Analysis
                        {lastUpdated && <span className="text-xs text-muted-foreground/50">· Updated {format(lastUpdated, "h:mm:ss a")}</span>}
                    </p>
                </div>

                {/* Controls - Centered */}
                <div className="flex items-center gap-2 sm:absolute sm:left-1/2 sm:-translate-x-1/2 bg-card/50 p-1.5 rounded-lg border border-border/50 backdrop-blur-sm shadow-sm">
                    {/* Date Picker - Native Input Style to match MIS Report */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground hidden sm:inline">As of:</span>
                        <input
                            type="date"
                            className="border border-white/10 rounded px-2 py-1 text-sm bg-black/20 text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-9"
                            value={date ? format(date, "yyyy-MM-dd") : ""}
                            onChange={(e) => {
                                const newDate = e.target.value ? new Date(e.target.value) : undefined;
                                if (newDate) handleDateSelect(newDate);
                            }}
                        />
                    </div>

                    <div className="h-6 w-px bg-border/50 mx-1" />

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        className={cn("h-9 w-9 bg-background/50 hover:bg-accent/50 border-input/50", loading && "animate-spin")}
                        title="Refresh Data"
                    >
                        <RefreshCcw className="h-4 w-4 text-primary" />
                    </Button>

                    <div
                        className={cn(
                            "flex items-center gap-2 px-3 h-9 rounded-md border text-xs font-medium cursor-pointer transition-all select-none",
                            isAutoRefresh
                                ? "bg-primary/10 border-primary/20 text-primary"
                                : "bg-background/50 border-input/50 text-muted-foreground hover:bg-accent/50"
                        )}
                        onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                        title="Toggle Auto Refresh (5s)"
                    >
                        <div className={cn("w-2 h-2 rounded-full", isAutoRefresh ? "bg-primary animate-pulse" : "bg-muted-foreground/50")} />
                        <span>Auto</span>
                    </div>

                    <div className="h-6 w-px bg-border/50 mx-1" />

                    {/* Export Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-2 bg-background/50 border-input/50">
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">Export</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
                                <FileText className="h-4 w-4 text-red-500" />
                                Export as PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
                                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                Export as Excel
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="sr-only">Loading...</span>
                </div>
            ) : !reportData || !reportData.Rows ? (
                <div className="p-8 text-center bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                    Failed to load report data. Please try again.
                </div>
            ) : (
                <Card className="glass border-white/10 mt-6">
                    <CardHeader>
                        <CardTitle className="text-foreground flex justify-between items-center">
                            <span>Outstanding Receivables</span>
                            <span className="text-sm font-normal text-muted-foreground">
                                Total: {reportData.Rows.Row?.[reportData.Rows.Row.length - 1]?.Summary?.ColData?.[reportData.Columns.Column.length - 1]?.value || "N/A"}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-white/10">
                                <thead className="bg-white/5">
                                    <tr>
                                        {reportData.Columns.Column.map((col: any, i: number) => (
                                            <th key={i} className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                {col.ColTitle}
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider w-16">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-transparent divide-y divide-white/10">
                                    {reportData.Rows.Row && reportData.Rows.Row.map((row: any, i: number) => {
                                        if (!row.ColData) return null;

                                        // Determine if this is a data row (not a total/summary row)
                                        const isDataRow = !row.Summary && !row.group && row.ColData?.[0]?.value && row.ColData[0].value !== "";
                                        const customerName = row.ColData?.[0]?.value || "";
                                        const totalValue = row.ColData?.[row.ColData.length - 1]?.value || "0";

                                        return (
                                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                                {row.ColData.map((cell: any, j: number) => (
                                                    <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                                        {cell.value}
                                                    </td>
                                                ))}
                                                <td className="px-4 py-4 text-center">
                                                    {isDataRow && customerName && (
                                                        <button
                                                            onClick={() => handleSendEmail(customerName, totalValue)}
                                                            className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200 group"
                                                            title={`Send payment reminder to ${customerName}`}
                                                        >
                                                            <Mail className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {(!reportData.Rows.Row || reportData.Rows.Row.length === 0) && (
                                <p className="text-center p-8 text-muted-foreground">No open invoices found.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Email Dialog */}
            <EmailDialog
                open={emailDialogOpen}
                onClose={() => setEmailDialogOpen(false)}
                customerName={selectedCustomer.name}
                totalAmount={selectedCustomer.total}
                companyName={companyName}
            />
        </div>
    );
}
