"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, FileText, FileSpreadsheet, Download, Trash2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

// Parser Registry
import { parsers, getParser } from "@/lib/bank-parsers";
import { TextItem, ParsedTransaction } from "@/lib/bank-parsers/types";

// PDF.js - Imported dynamically
// import * as pdfjsLib from "pdfjs-dist";

export function BankStatementParser() {
    const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
    const [fileName, setFileName] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [parserName, setParserName] = useState<string>("Sample Bank");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Dynamic import handles worker loading internally when needed or we set it then.

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setIsLoading(true);
        setTransactions([]);

        try {
            if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                await parseExcelOrCsv(file);
            } else if (file.name.endsWith('.pdf')) {
                await parsePdfClientSide(file);
            } else {
                toast.error("Unsupported file format. Please upload PDF, CSV, or Excel.");
            }
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to parse file: " + error.message);
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const parsePdfClientSide = async (file: File) => {
        try {
            // Dynamic Import to avoid SSR/Build issues with pdfjs-dist
            const pdfjsLib = await import("pdfjs-dist");

            // Set worker source using the version from the dynamically imported module
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let allTextItems: TextItem[] = [];

            // Iterate over all pages
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();

                const viewport = page.getViewport({ scale: 1.0 });

                // Map items with geometry
                const items = textContent.items.map((item: any) => {
                    // pdf.js coords: (0,0) is bottom-left usually.
                    // transform[5] is Y (translateY), transform[4] is X.
                    const tx = item.transform;
                    const x = tx[4];
                    const y = tx[5];

                    return {
                        str: item.str,
                        x: x,
                        y: y,
                        w: item.width,
                        h: item.height
                    };
                });

                allTextItems = [...allTextItems, ...items];
            }

            // Select strategy
            const parser = getParser(parserName);
            const parsedTransactions = await parser.parse(allTextItems);

            if (parsedTransactions.length > 0) {
                setTransactions(parsedTransactions);
                toast.success(`Successfully parsed ${parsedTransactions.length} transactions using ${parser.name}.`);
            } else {
                toast.warning(`No transactions found using ${parser.name}. Try a different template.`);
            }

        } catch (error: any) {
            console.error("Client-side PDF parse error:", error);
            throw new Error("Could not read PDF file.");
        }
    };

    const parseExcelOrCsv = (file: File) => {
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    processTableData(jsonData as any[]);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsBinaryString(file);
        });
    };

    const processTableData = (rows: any[]) => {
        // Existing Excel Logic (Unchanged for now as it works for CSV/Excel)
        // ... (Included existing logic for brevity in Artifact, but will write full code in tool call)

        // Re-implementing existing logic for completeness context
        const parsed: ParsedTransaction[] = [];
        let headerIndex = -1;
        let dateCol = -1;
        let descCol = -1;
        let debitCol = -1;
        let creditCol = -1;
        let amountCol = -1;
        let balanceCol = -1;

        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const row = rows[i].map((cell: any) => String(cell).toLowerCase());
            if (row.some((c: string) => c.includes('date') || c.includes('txn') || c.includes('description') || c.includes('amount'))) {
                headerIndex = i;
                row.forEach((cell: string, idx: number) => {
                    if (cell.includes('date')) dateCol = idx;
                    else if (cell.includes('description') || cell.includes('particulars')) descCol = idx;
                    else if (cell.includes('debit') || cell.includes('withdrawal')) debitCol = idx;
                    else if (cell.includes('credit') || cell.includes('deposit')) creditCol = idx;
                    else if (cell.includes('amount')) amountCol = idx;
                    else if (cell.includes('balance')) balanceCol = idx;
                });
                break;
            }
        }

        if (headerIndex !== -1) {
            for (let i = headerIndex + 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;
                let date = row[dateCol];
                try {
                    if (typeof date === 'number') date = new Date(Math.round((date - 25569) * 86400 * 1000)).toISOString().split('T')[0];
                    else if (date instanceof Date) date = date.toISOString().split('T')[0];
                    else if (typeof date === 'string') {
                        const d = new Date(date);
                        if (!isNaN(d.getTime())) date = d.toISOString().split('T')[0];
                        else date = "";
                    }
                } catch (e) { date = ""; }
                if (!date) continue;

                const desc = String(row[descCol] || "");
                let amount = 0;
                let type: 'debit' | 'credit' = 'debit';

                if (debitCol !== -1 && row[debitCol]) {
                    amount = parseFloat(String(row[debitCol]).replace(/[^0-9.-]/g, ''));
                    type = 'debit';
                } else if (creditCol !== -1 && row[creditCol]) {
                    amount = parseFloat(String(row[creditCol]).replace(/[^0-9.-]/g, ''));
                    type = 'credit';
                } else if (amountCol !== -1 && row[amountCol]) {
                    const val = parseFloat(String(row[amountCol]).replace(/[^0-9.-]/g, ''));
                    amount = Math.abs(val);
                    type = val < 0 ? 'debit' : 'credit';
                }

                if (amount === 0 && !row[debitCol] && !row[creditCol] && !row[amountCol]) continue;
                const balance = balanceCol !== -1 ? parseFloat(String(row[balanceCol]).replace(/[^0-9.-]/g, '')) : undefined;

                parsed.push({
                    id: `txn-${i}`,
                    date: date as string,
                    description: desc,
                    amount: amount,
                    type,
                    balance
                });
            }
        }

        if (parsed.length > 0) {
            setTransactions(parsed);
            toast.success(`Successfully parsed ${parsed.length} transactions from Excel/CSV.`);
        } else {
            toast.warning("Could not automatically detect columns in Excel.");
        }
    };

    const handleExport = () => {
        if (transactions.length === 0) return;
        const ws = XLSX.utils.json_to_sheet(transactions.map(t => ({
            Date: t.date,
            Description: t.description,
            Amount: t.amount,
            Type: t.type.toUpperCase(),
            Balance: t.balance || ""
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Transactions");
        XLSX.writeFile(wb, `parsed_statement_${new Date().getTime()}.xlsx`);
    };

    const handleDelete = (id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
    };

    return (
        <div className="space-y-6">
            <Card className="glass border-white/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-green-400" />
                        Bank Statement Parser
                    </CardTitle>
                    <CardDescription>
                        Convert PDF, CSV, or Excel statements into structured data.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-6">
                        {/* Control Bar */}
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Select Parser Template</label>
                                <Select value={parserName} onValueChange={setParserName}>
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Select Bank" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {parsers.map(p => (
                                            <SelectItem key={p.name} value={p.name}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Upload Statement</label>
                                <Input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.csv,.xlsx,.xls"
                                    onChange={handleFileUpload}
                                    disabled={isLoading}
                                    className="cursor-pointer"
                                />
                            </div>

                            {isLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mb-2" />}
                        </div>

                        {transactions.length > 0 && (
                            <div className="mt-4 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-medium text-muted-foreground">
                                        Parsed Transactions ({transactions.length})
                                    </h3>
                                    <Button onClick={handleExport} size="sm" variant="outline" className="gap-2">
                                        <Download className="w-4 h-4" /> Export Excel
                                    </Button>
                                </div>

                                <div className="border rounded-md overflow-hidden max-h-[500px] overflow-y-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/50 sticky top-0 backdrop-blur-sm z-10">
                                            <TableRow>
                                                <TableHead className="w-[120px]">Date</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="text-right">Debit</TableHead>
                                                <TableHead className="text-right">Credit</TableHead>
                                                <TableHead className="text-right">Balance</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transactions.map((txn) => (
                                                <TableRow key={txn.id}>
                                                    <TableCell className="font-medium">{txn.date}</TableCell>
                                                    <TableCell>{txn.description}</TableCell>
                                                    <TableCell className="text-right text-red-400">
                                                        {txn.type === 'debit' ? txn.amount.toFixed(2) : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right text-green-400">
                                                        {txn.type === 'credit' ? txn.amount.toFixed(2) : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground">
                                                        {txn.balance ? txn.balance.toFixed(2) : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/50 hover:text-destructive" onClick={() => handleDelete(txn.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {!isLoading && transactions.length === 0 && fileName && (
                            <div className="mt-8 text-center py-12 border-2 border-dashed rounded-lg border-muted">
                                <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                                <p className="text-muted-foreground">No transactions found with "{parserName}" template.</p>
                                <p className="text-xs text-muted-foreground/50 mt-1">Try switching to a different template.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
