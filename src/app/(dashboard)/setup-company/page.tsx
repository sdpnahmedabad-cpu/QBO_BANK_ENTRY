"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Settings2,
    Plus,
    Trash2,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Building,
    LayoutGrid,
    ChevronRight,
    Search,
    ShieldPlus,
    FileSearch
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { BankStatementParser } from "@/components/setup/BankStatementParser";

interface COATemplate {
    id?: string;
    account_name: string;
    account_type: string;
    detail_type: string;
    description: string;
}

interface Industry {
    id: string;
    name: string;
    industry_coa_templates: COATemplate[];
}

export default function SetupCompanyPage() {
    const { selectedCompany } = useStore();
    const [industries, setIndustries] = useState<Industry[]>([]);
    const [selectedIndustry, setSelectedIndustry] = useState<string>("");
    const [accounts, setAccounts] = useState<COATemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [suggestedRules, setSuggestedRules] = useState<any[]>([]);
    const [qboAccounts, setQboAccounts] = useState<any[]>([]);
    const [qboContacts, setQboContacts] = useState<any[]>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isSavingRules, setIsSavingRules] = useState(false);

    useEffect(() => {
        fetchIndustries();
        if (selectedCompany?.id) {
            fetchQBOAccounts();
            fetchQBOContacts();
        }
    }, [selectedCompany?.id]);

    const fetchQBOContacts = async () => {
        try {
            const [vRes, cRes] = await Promise.all([
                fetch(`/api/qbo/vendors?companyId=${selectedCompany?.id}`),
                fetch(`/api/qbo/customers?companyId=${selectedCompany?.id}`)
            ]);
            const vendors = await vRes.json();
            const customers = await cRes.json();

            const allContacts = [
                ...(Array.isArray(vendors) ? vendors.map((v: any) => ({ ...v, Type: 'Vendor' })) : []),
                ...(Array.isArray(customers) ? customers.map((c: any) => ({ ...c, Type: 'Customer' })) : [])
            ];
            setQboContacts(allContacts);
        } catch (error) {
            console.error("Failed to fetch QBO contacts:", error);
        }
    };

    const fetchQBOAccounts = async () => {
        try {
            const response = await fetch(`/api/qbo/accounts?companyId=${selectedCompany?.id}`);
            const data = await response.json();
            if (response.ok) {
                setQboAccounts(data);
            }
        } catch (error) {
            console.error("Failed to fetch QBO accounts:", error);
        }
    };

    const fetchIndustries = async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/setup/industries");
            const data = await response.json();
            if (response.ok) {
                setIndustries(data);
            }
        } catch (error) {
            console.error("Failed to fetch industries:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleIndustryChange = (val: string) => {
        setSelectedIndustry(val);
        const industry = industries.find(i => i.id === val);
        if (industry) {
            setAccounts(industry.industry_coa_templates.map(a => ({ ...a })));
        }
    };

    const addAccount = () => {
        setAccounts([...accounts, {
            account_name: "",
            account_type: "Expense",
            detail_type: "OtherBusinessExpenses",
            description: ""
        }]);
    };

    const removeAccount = (index: number) => {
        setAccounts(accounts.filter((_, i) => i !== index));
    };

    const updateAccount = (index: number, field: keyof COATemplate, value: string) => {
        const newAccounts = [...accounts];
        newAccounts[index] = { ...newAccounts[index], [field]: value };
        setAccounts(newAccounts);
    };

    const handleCreate = async () => {
        if (!selectedCompany?.id) {
            setNotification({ message: "Please select a company in the header first", type: 'error' });
            return;
        }

        if (accounts.length === 0) {
            setNotification({ message: "No accounts to create", type: 'error' });
            return;
        }

        // Basic validation
        if (accounts.some(a => !a.account_name || !a.account_type || !a.detail_type)) {
            setNotification({ message: "Please fill in all account details", type: 'error' });
            return;
        }

        setIsCreating(true);
        try {
            const response = await fetch("/api/setup/create-accounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyId: selectedCompany.id,
                    accounts: accounts.map(a => ({
                        Name: a.account_name,
                        AccountType: a.account_type,
                        DetailType: a.detail_type,
                        Description: a.description
                    }))
                }),
            });

            const data = await response.json();
            if (response.ok && data.success) {
                setNotification({
                    message: `Successfully created ${data.createdCount} accounts in ${selectedCompany.name}.`,
                    type: 'success'
                });
            } else {
                setNotification({ message: data.error || "Failed to create accounts", type: 'error' });
            }
        } catch (error) {
            setNotification({ message: "An error occurred during creation", type: 'error' });
        } finally {
            setIsCreating(false);
        }
    };

    const handleSuggestRules = async () => {
        if (!selectedCompany?.id) {
            setNotification({ message: "Please select a company first", type: 'error' });
            return;
        }

        setIsSuggesting(true);
        try {
            const response = await fetch(`/api/setup/suggest-rules?companyId=${selectedCompany.id}&startDate=${startDate}&endDate=${endDate}`);
            const data = await response.json();
            if (response.ok) {
                setSuggestedRules(data);
                if (data.length === 0) {
                    setNotification({ message: "No transactions found in this date range to create rules.", type: 'error' });
                }
            } else {
                setNotification({ message: data.error || "Failed to fetch suggestions", type: 'error' });
            }
        } catch (error) {
            setNotification({ message: "An error occurred while fetching suggestions", type: 'error' });
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleUpdateSuggestedRule = (index: number, field: string, value: any) => {
        const newRules = [...suggestedRules];
        if (field === 'account') {
            newRules[index].actions.ledger = value.name;
        } else if (field === 'contact') {
            newRules[index].actions.contactId = value.id;
        } else {
            newRules[index][field] = value;
        }
        setSuggestedRules(newRules);
    };

    const handleSaveRules = async () => {
        if (!selectedCompany?.id || suggestedRules.length === 0) return;

        setIsSavingRules(true);
        try {
            let successCount = 0;
            for (const rule of suggestedRules) {
                const response = await fetch("/api/rules", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        client_id: selectedCompany.id,
                        rule_name: rule.rule_name,
                        matchType: rule.match_type,
                        conditions: rule.conditions,
                        rule_type: rule.rule_type,
                        actions: rule.actions
                    }),
                });
                if (response.ok) successCount++;
            }

            setNotification({
                message: `Successfully saved ${successCount} rules to the rules engine.`,
                type: 'success'
            });
            setSuggestedRules([]);
        } catch (error) {
            setNotification({ message: "Failed to save some rules", type: 'error' });
        } finally {
            setIsSavingRules(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">
                        Set-up <span className="text-primary">Company</span>
                    </h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <Settings2 size={16} className="text-primary" />
                        Complete the initial configuration for your client company.
                    </p>
                </div>
            </div>

            {/* Notification Banner */}
            {notification && (
                <div className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl animate-in slide-in-from-top-4 duration-500 border",
                    notification.type === 'success' ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                )}>
                    {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <p className="text-sm font-bold uppercase tracking-wider">{notification.message}</p>
                    <button onClick={() => setNotification(null)} className="ml-auto opacity-50 hover:opacity-100 transition-opacity">
                        <Trash2 size={16} />
                    </button>
                </div>
            )}

            <Tabs defaultValue="coa" className="w-full space-y-8">
                <TabsList className="bg-white/5 border border-white/10 p-1 h-auto rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-2">
                    <TabsTrigger value="coa" className="rounded-xl py-3 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-glow flex items-center gap-2 uppercase font-black tracking-widest text-[10px]">
                        <LayoutGrid size={14} />
                        Chart of Accounts
                    </TabsTrigger>
                    <TabsTrigger value="rules" className="rounded-xl py-3 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-glow flex items-center gap-2 uppercase font-black tracking-widest text-[10px]">
                        <ShieldPlus size={14} />
                        Create Rules
                    </TabsTrigger>
                    <TabsTrigger value="bank-parse" className="rounded-xl py-3 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-glow flex items-center gap-2 uppercase font-black tracking-widest text-[10px]">
                        <FileSearch size={14} />
                        Create Bank Parse
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="coa" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="glass-premium border-white/5 col-span-1">
                            <CardHeader>
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary italic">Industry Template</CardTitle>
                                <CardDescription>Select your industry to load a template.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Choose Industry</label>
                                    <Select onValueChange={handleIndustryChange} value={selectedIndustry}>
                                        <SelectTrigger className="w-full bg-black/40 border-white/10 rounded-xl h-12 focus:ring-primary/20">
                                            <SelectValue placeholder="Select industry..." />
                                        </SelectTrigger>
                                        <SelectContent className="glass-strong border-white/10 text-white">
                                            {industries.map(ind => (
                                                <SelectItem key={ind.id} value={ind.id} className="focus:bg-primary/20 focus:text-white uppercase font-bold text-xs tracking-wider cursor-pointer py-3 hover:translate-x-1 transition-transform">
                                                    {ind.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <Building size={18} className="text-primary" />
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-bold text-white uppercase tracking-wider">Target Company</p>
                                            <p className="text-[11px] font-medium">{selectedCompany?.name || "None Selected"}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-premium border-white/5 col-span-2 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                            <CardHeader className="relative z-10 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary italic">Preview COA</CardTitle>
                                    <CardDescription>Review and customize accounts for {selectedCompany?.name}.</CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={addAccount}
                                    className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 rounded-xl px-4"
                                >
                                    <Plus size={16} className="mr-2" />
                                    Add Account
                                </Button>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                {selectedIndustry ? (
                                    <div className="overflow-x-auto custom-scrollbar border border-white/5 rounded-2xl">
                                        <Table>
                                            <TableHeader className="bg-white/[0.03]">
                                                <TableRow className="hover:bg-transparent border-white/5">
                                                    <TableHead className="text-[10px] font-black uppercase tracking-wider py-4">Account Name</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-wider py-4">Type</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-wider py-4">Detail Type</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-wider py-4 text-right">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {accounts.map((acc, index) => (
                                                    <TableRow key={index} className="hover:bg-white/[0.02] border-white/5 transition-colors group">
                                                        <TableCell className="py-3">
                                                            <Input
                                                                value={acc.account_name}
                                                                onChange={(e) => updateAccount(index, 'account_name', e.target.value)}
                                                                className="h-9 bg-black/20 border-white/5 rounded-lg text-sm transition-all focus:border-primary/50"
                                                                placeholder="Account Name"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            <Input
                                                                value={acc.account_type}
                                                                onChange={(e) => updateAccount(index, 'account_type', e.target.value)}
                                                                className="h-9 bg-black/20 border-white/5 rounded-lg text-xs font-bold uppercase tracking-wider"
                                                                placeholder="Account Type"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            <Input
                                                                value={acc.detail_type}
                                                                onChange={(e) => updateAccount(index, 'detail_type', e.target.value)}
                                                                className="h-9 bg-black/20 border-white/5 rounded-lg text-xs text-muted-foreground"
                                                                placeholder="Detail Type"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="py-3 text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeAccount(index)}
                                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded-lg group-hover:opacity-100 opacity-20 transition-all"
                                                            >
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
                                            <Search size={32} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-white font-bold">No Template Selected</p>
                                            <p className="text-sm text-muted-foreground">Select an industry on the left to begin setup.</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button
                            size="lg"
                            onClick={handleCreate}
                            disabled={isCreating || !selectedIndustry || accounts.length === 0}
                            className="bg-primary text-white hover:shadow-glow px-12 py-7 rounded-2xl text-lg font-black uppercase tracking-[0.2em] transition-all disabled:opacity-20 disabled:grayscale"
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 size={24} className="mr-3 animate-spin" />
                                    Creating in QuickBooks...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={24} className="mr-3" />
                                    Push to QuickBooks
                                </>
                            )}
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="rules" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card className="glass-premium border-white/5 col-span-1">
                            <CardHeader>
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary italic">Fetch Range</CardTitle>
                                <CardDescription>Select period to analyze transactions.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">From Date</label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="bg-black/40 border-white/10 rounded-xl h-12 focus:ring-primary/20 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">To Date</label>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="bg-black/40 border-white/10 rounded-xl h-12 focus:ring-primary/20 text-white"
                                    />
                                </div>
                                <Button
                                    onClick={handleSuggestRules}
                                    disabled={isSuggesting || !selectedCompany?.id}
                                    className="w-full bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 h-12 rounded-xl font-bold uppercase tracking-widest text-xs mt-2"
                                >
                                    {isSuggesting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Search size={16} className="mr-2" />}
                                    Suggest Rules
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="glass-premium border-white/5 col-span-3 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                            <CardHeader className="relative z-10 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary italic">Rule Preview</CardTitle>
                                    <CardDescription>Review suggested rules before saving.</CardDescription>
                                </div>
                                {suggestedRules.length > 0 && (
                                    <Button
                                        onClick={handleSaveRules}
                                        disabled={isSavingRules}
                                        className="bg-primary text-white hover:shadow-glow rounded-xl px-6 h-10 font-bold uppercase tracking-wider text-xs"
                                    >
                                        {isSavingRules ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                                        Save All Rules
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="relative z-10">
                                {suggestedRules.length > 0 ? (
                                    <div className="overflow-x-auto custom-scrollbar border border-white/5 rounded-2xl">
                                        <Table>
                                            <TableHeader className="bg-white/[0.03]">
                                                <TableRow className="hover:bg-transparent border-white/5">
                                                    <TableHead className="text-[10px] font-black uppercase tracking-wider py-4">Rule Name</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-wider py-4">Match Description</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-wider py-4">Target Account</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-wider py-4">Target Contact</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-wider py-4 text-right">Delete</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {suggestedRules.map((rule, idx) => (
                                                    <TableRow key={idx} className="hover:bg-white/[0.02] border-white/5 transition-colors">
                                                        <TableCell className="py-3">
                                                            <Input
                                                                value={rule.rule_name}
                                                                onChange={(e) => handleUpdateSuggestedRule(idx, 'rule_name', e.target.value)}
                                                                className="h-9 bg-black/20 border-white/5 rounded-lg text-sm"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[10px] py-1">
                                                                {rule.conditions[0].value}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            <Select
                                                                onValueChange={(val) => {
                                                                    handleUpdateSuggestedRule(idx, 'account', { name: val });
                                                                }}
                                                                value={rule.actions.ledger}
                                                            >
                                                                <SelectTrigger className="h-9 bg-black/20 border-white/5 rounded-lg text-xs">
                                                                    <SelectValue placeholder="Select Account" />
                                                                </SelectTrigger>
                                                                <SelectContent className="glass-strong border-white/10 max-h-[300px]">
                                                                    {qboAccounts.map(acc => (
                                                                        <SelectItem key={acc.Id} value={acc.Name} className="text-xs">
                                                                            {acc.Name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell className="py-3">
                                                            <Select
                                                                onValueChange={(val) => {
                                                                    handleUpdateSuggestedRule(idx, 'contact', { id: val });
                                                                }}
                                                                value={rule.actions.contactId}
                                                            >
                                                                <SelectTrigger className="h-9 bg-black/20 border-white/5 rounded-lg text-xs">
                                                                    <SelectValue placeholder="Select Contact" />
                                                                </SelectTrigger>
                                                                <SelectContent className="glass-strong border-white/10 max-h-[300px]">
                                                                    {qboContacts.map(contact => (
                                                                        <SelectItem key={contact.Id} value={contact.Id} className="text-xs">
                                                                            {contact.DisplayName || contact.Name} ({contact.Type})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell className="py-3 text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setSuggestedRules(suggestedRules.filter((_, i) => i !== idx))}
                                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded-lg"
                                                            >
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
                                            <ShieldPlus size={32} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-white font-bold">No Suggestions Yet</p>
                                            <p className="text-sm text-muted-foreground">Select a date range and click "Suggest Rules" to analyze transactions.</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="bank-parse" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <BankStatementParser />
                </TabsContent>
            </Tabs>
        </div>
    );
}
