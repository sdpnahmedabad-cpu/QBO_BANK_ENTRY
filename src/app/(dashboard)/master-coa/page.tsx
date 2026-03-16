"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Database,
    Plus,
    Trash2,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Building2,
    LayoutGrid,
    Search,
    Download,
    X,
    Edit2,
    Copy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";

interface COATemplate {
    id: string;
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

export default function MasterCOAPage() {
    const { selectedCompany } = useStore();
    const [industries, setIndustries] = useState<Industry[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // UI Local States
    const [isAddIndustryOpen, setIsAddIndustryOpen] = useState(false);
    const [newIndustryName, setNewIndustryName] = useState("");
    const [editingAccount, setEditingAccount] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<Partial<COATemplate>>({});

    useEffect(() => {
        fetchIndustries();
    }, []);

    const fetchIndustries = async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/setup/industries");
            const data = await response.json();
            if (response.ok) {
                setIndustries(data);
                if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch industries:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddIndustry = async (cloneFromQbo = false) => {
        if (!newIndustryName) return;
        setIsActionLoading(true);
        try {
            const body: any = { name: newIndustryName };
            if (cloneFromQbo && selectedCompany?.id) {
                body.companyId = selectedCompany.id;
            }

            const response = await fetch("/api/setup/industries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                const data = await response.json();
                setNotification({ message: `Industry '${newIndustryName}' created!`, type: 'success' });
                setNewIndustryName("");
                setIsAddIndustryOpen(false);
                await fetchIndustries();
                setSelectedId(data.id);
            } else {
                const err = await response.json();
                setNotification({ message: err.error || "Failed to create industry", type: 'error' });
            }
        } catch (error) {
            setNotification({ message: "An error occurred", type: 'error' });
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteIndustry = async (id: string) => {
        if (!confirm("Delete this industry and all its accounts?")) return;
        setIsActionLoading(true);
        try {
            const response = await fetch("/api/setup/industries", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id })
            });

            if (response.ok) {
                setNotification({ message: "Industry deleted", type: 'success' });
                await fetchIndustries();
                if (selectedId === id) setSelectedId(industries[0]?.id || null);
            }
        } catch (error) {
            setNotification({ message: "Delete failed", type: 'error' });
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleAddAccount = async () => {
        if (!selectedId) return;
        setIsActionLoading(true);
        try {
            const response = await fetch("/api/setup/coa-templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    industry_id: selectedId,
                    account_name: "New Account",
                    account_type: "Expense",
                    detail_type: "OtherBusinessExpenses",
                    description: ""
                })
            });

            if (response.ok) {
                await fetchIndustries();
                setEditingAccount((await response.json()).id);
                setEditValues({
                    account_name: "New Account",
                    account_type: "Expense",
                    detail_type: "OtherBusinessExpenses",
                    description: ""
                });
            }
        } catch (error) {
            setNotification({ message: "Failed to add account", type: 'error' });
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSaveAccount = async (id: string) => {
        setIsActionLoading(true);
        try {
            const response = await fetch("/api/setup/coa-templates", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, ...editValues })
            });

            if (response.ok) {
                setNotification({ message: "Account updated", type: 'success' });
                setEditingAccount(null);
                await fetchIndustries();
            }
        } catch (error) {
            setNotification({ message: "Save failed", type: 'error' });
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteAccount = async (id: string) => {
        setIsActionLoading(true);
        try {
            const response = await fetch("/api/setup/coa-templates", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id })
            });

            if (response.ok) {
                await fetchIndustries();
            }
        } catch (error) {
            setNotification({ message: "Delete failed", type: 'error' });
        } finally {
            setIsActionLoading(false);
        }
    };

    const currentIndustry = industries.find(i => i.id === selectedId);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">
                        Master <span className="text-primary">COA Library</span>
                    </h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <Database size={16} className="text-primary" />
                        Manage your global database of industry-specific Chart of Accounts.
                    </p>
                </div>
                <Button
                    variant="outline"
                    className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-xs"
                    onClick={() => setIsAddIndustryOpen(true)}
                >
                    <Plus size={18} className="mr-2" />
                    New Industry
                </Button>
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
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Add Industry Form */}
            {isAddIndustryOpen && (
                <Card className="glass-premium border-primary/20 animate-in zoom-in duration-300">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-black uppercase italic text-white">Create New Template</CardTitle>
                            <CardDescription>Optionally clone accounts from a connected QuickBooks company.</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setIsAddIndustryOpen(false)} className="rounded-xl">
                            <X size={18} />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex flex-col md:flex-row items-end gap-6">
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Industry Name</label>
                            <Input
                                value={newIndustryName}
                                onChange={(e) => setNewIndustryName(e.target.value)}
                                className="h-12 bg-black/40 border-white/10 rounded-xl focus:border-primary/50"
                                placeholder="e.g. Real Estate, Law Firm..."
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button
                                onClick={() => handleAddIndustry(false)}
                                disabled={isActionLoading || !newIndustryName}
                                className="h-12 px-6 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10"
                            >
                                <Plus size={16} className="mr-2" />
                                Empty Template
                            </Button>
                            <Button
                                onClick={() => handleAddIndustry(true)}
                                disabled={isActionLoading || !newIndustryName || !selectedCompany?.id}
                                className="h-12 px-6 rounded-xl bg-primary text-white hover:shadow-glow"
                            >
                                <Copy size={16} className="mr-2" />
                                Clone from {selectedCompany?.name || "QBO"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Industry List Sidebar */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Library Categories</h3>
                        <Badge className="bg-primary/10 text-primary border-none text-[9px]">{industries.length}</Badge>
                    </div>
                    <div className="space-y-1">
                        {isLoading ? (
                            <div className="flex justify-center py-10 opacity-20"><Loader2 className="animate-spin" /></div>
                        ) : industries.map(ind => (
                            <div
                                key={ind.id}
                                onClick={() => setSelectedId(ind.id)}
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border group",
                                    selectedId === ind.id
                                        ? "bg-primary/10 border-primary/20 text-white shadow-lg shadow-primary/5 translate-x-2"
                                        : "bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/5 hover:border-white/10"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <LayoutGrid size={16} className={selectedId === ind.id ? "text-primary" : "opacity-30"} />
                                    <span className="text-sm font-bold uppercase tracking-wider italic">{ind.name}</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteIndustry(ind.id); }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Account Table */}
                <Card className="lg:col-span-3 glass-premium border-white/5 relative overflow-hidden h-fit">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                    <CardHeader className="relative z-10 flex flex-row items-center justify-between border-b border-white/5">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-black uppercase italic text-white flex items-center gap-3">
                                <span className="text-primary">{currentIndustry?.name}</span>
                                <span className="text-[10px] not-italic font-bold text-muted-foreground/40 font-mono tracking-tighter self-end mb-1">ID: {currentIndustry?.id}</span>
                            </CardTitle>
                            <CardDescription>Definitions for this industry's standard Chart of Accounts.</CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddAccount}
                            disabled={!selectedId || isActionLoading}
                            className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 rounded-xl px-5 h-10 font-bold uppercase tracking-widest text-[10px]"
                        >
                            <Plus size={16} className="mr-2" />
                            Add Account
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0 relative z-10">
                        {currentIndustry ? (
                            <div className="overflow-x-auto custom-scrollbar">
                                <Table>
                                    <TableHeader className="bg-white/[0.03]">
                                        <TableRow className="hover:bg-transparent border-white/5">
                                            <TableHead className="text-[10px] font-black uppercase tracking-wider py-5 px-8">Account Name</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-wider py-5 px-8">Type</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-wider py-5 px-8">Detail Type</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-wider py-5 px-8 text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {currentIndustry.industry_coa_templates.map((acc) => (
                                            <TableRow key={acc.id} className="hover:bg-white/[0.02] border-white/5 transition-colors group">
                                                <TableCell className="py-4 px-8">
                                                    {editingAccount === acc.id ? (
                                                        <Input
                                                            value={editValues.account_name}
                                                            onChange={(e) => setEditValues(prev => ({ ...prev, account_name: e.target.value }))}
                                                            className="h-9 bg-black/40 border-primary/50 text-white font-bold"
                                                        />
                                                    ) : (
                                                        <span className="font-bold text-white uppercase tracking-wider text-xs">{acc.account_name}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-4 px-8">
                                                    {editingAccount === acc.id ? (
                                                        <Input
                                                            value={editValues.account_type}
                                                            onChange={(e) => setEditValues(prev => ({ ...prev, account_type: e.target.value }))}
                                                            className="h-9 bg-black/40 border-white/10 text-xs text-muted-foreground uppercase font-bold"
                                                        />
                                                    ) : (
                                                        <Badge variant="outline" className="bg-white/5 border-white/10 text-[9px] font-black uppercase tracking-widest">{acc.account_type}</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-4 px-8 font-mono text-[10px] text-muted-foreground/60 uppercase">
                                                    {editingAccount === acc.id ? (
                                                        <Input
                                                            value={editValues.detail_type}
                                                            onChange={(e) => setEditValues(prev => ({ ...prev, detail_type: e.target.value }))}
                                                            className="h-9 bg-black/40 border-white/10 text-[10px] text-muted-foreground"
                                                        />
                                                    ) : acc.detail_type}
                                                </TableCell>
                                                <TableCell className="py-4 px-8 text-right">
                                                    {editingAccount === acc.id ? (
                                                        <div className="flex justify-end gap-2">
                                                            <Button size="sm" variant="ghost" onClick={() => setEditingAccount(null)} className="h-8 w-8 p-0 rounded-lg"><X size={14} /></Button>
                                                            <Button size="sm" onClick={() => handleSaveAccount(acc.id)} className="h-8 px-3 rounded-lg bg-primary text-white text-[10px] font-bold uppercase"><Save size={14} className="mr-1" /> Save</Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => { setEditingAccount(acc.id); setEditValues(acc); }}
                                                                className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary rounded-lg"
                                                            >
                                                                <Edit2 size={14} />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteAccount(acc.id)}
                                                                className="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-400 rounded-lg"
                                                            >
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {currentIndustry.industry_coa_templates.length === 0 && (
                                    <div className="py-20 flex flex-col items-center justify-center space-y-4 opacity-40">
                                        <Plus size={40} />
                                        <p className="font-bold uppercase tracking-widest text-xs">No accounts in this template</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="py-40 flex flex-col items-center justify-center space-y-6">
                                <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-white/10">
                                    <LayoutGrid size={40} />
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="text-lg font-black uppercase italic text-white/40">Select Industry</p>
                                    <p className="text-sm text-muted-foreground/40">Load a template from the left to manage its library.</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Legend & Help */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 flex gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0"><Building2 size={20} /></div>
                    <div className="space-y-1">
                        <p className="text-[11px] font-black uppercase tracking-widest text-primary italic">Pro Tip: QBO Cloning</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Connect to a high-quality client company in QuickBooks first. Then use the <span className="text-white font-bold italic underline">"Clone from QBO"</span> feature here to instantly import their entire Chart of Accounts as a new master template for future use.
                        </p>
                    </div>
                </div>
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex gap-4">
                    <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 shrink-0"><LayoutGrid size={20} /></div>
                    <div className="space-y-1">
                        <p className="text-[11px] font-black uppercase tracking-widest text-white/40 italic">Industry Library</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            This library is your central repository. Changing accounts here <span className="text-white font-bold italic underline">will not modify</span> existing client accounts, but will be available for all new company setups.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
