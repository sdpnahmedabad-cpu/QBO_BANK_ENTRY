"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    Mail,
    Save,
    X,
    Edit2,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Building2,
    Calendar,
    Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
    id: string; // realmId
    name: string;
    client_email: string | null;
    is_active: boolean;
    created_at: string;
}

export default function ManageClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editEmail, setEditEmail] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/clients");
            const data = await response.json();
            if (response.ok) {
                setClients(data);
            } else {
                setNotification({ message: data.error || "Failed to fetch clients", type: 'error' });
            }
        } catch (error) {
            setNotification({ message: "An error occurred while fetching clients", type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (client: Client) => {
        setEditingId(client.id);
        setEditEmail(client.client_email || "");
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditEmail("");
    };

    const handleSave = async (id: string) => {
        setIsSaving(true);
        try {
            const response = await fetch("/api/clients", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ realmId: id, client_email: editEmail }),
            });

            const data = await response.json();
            if (response.ok) {
                setNotification({ message: "Client email updated successfully", type: 'success' });
                setClients(prev => prev.map(c => c.id === id ? { ...c, client_email: editEmail } : c));
                setEditingId(null);
            } else {
                setNotification({ message: data.error || "Failed to update email", type: 'error' });
            }
        } catch (error) {
            setNotification({ message: "An error occurred while updating email", type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">
                        Manage <span className="text-primary">Clients</span>
                    </h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <Building2 size={16} className="text-primary" />
                        Configure and maintain your connected QuickBooks organizations.
                    </p>
                </div>
                <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/20 bg-primary/5 text-primary font-bold uppercase tracking-widest text-[10px]">
                    {clients.length} Active Connections
                </Badge>
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

            {/* Clients Table Card */}
            <Card className="glass-premium border-white/5 shadow-2xl overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                <CardContent className="p-0 relative z-10">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            <p className="text-sm font-black uppercase tracking-[0.2em] text-white/40">Synchronizing registry...</p>
                        </div>
                    ) : clients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-6">
                            <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-white/20">
                                <Users size={40} />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-bold text-white">No Clients Found</h3>
                                <p className="text-muted-foreground">Connect a QuickBooks company to see it here.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar">
                            <Table>
                                <TableHeader className="bg-white/[0.03]">
                                    <TableRow className="hover:bg-transparent border-white/5">
                                        <TableHead className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 py-5 px-8">Company Details</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 py-5 px-8">QuickBooks ID</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 py-5 px-8">Primary Contact Email</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 py-5 px-8 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {clients.map((client) => (
                                        <TableRow key={client.id} className="hover:bg-white/[0.02] border-white/5 transition-colors group">
                                            {/* Company Name & Date */}
                                            <TableCell className="py-6 px-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black group-hover:scale-110 transition-transform">
                                                        {client.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="font-bold text-white group-hover:text-primary transition-colors">{client.name}</p>
                                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                                            <Calendar size={10} />
                                                            Added {new Date(client.created_at).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Realm ID */}
                                            <TableCell className="py-6 px-8">
                                                <code className="text-[11px] bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 text-muted-foreground font-mono">
                                                    {client.id}
                                                </code>
                                            </TableCell>

                                            {/* Email Field */}
                                            <TableCell className="py-6 px-8 min-w-[300px]">
                                                {editingId === client.id ? (
                                                    <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                                                        <div className="relative flex-1">
                                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                                                            <Input
                                                                value={editEmail}
                                                                onChange={(e) => setEditEmail(e.target.value)}
                                                                className="pl-9 h-10 bg-black/40 border-primary/30 focus:border-primary rounded-xl transition-all"
                                                                placeholder="Enter client email..."
                                                                autoFocus
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3 group/mail">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                                            client.client_email ? "bg-green-500/10 text-green-400" : "bg-white/5 text-muted-foreground"
                                                        )}>
                                                            <Mail size={14} />
                                                        </div>
                                                        <span className={cn(
                                                            "font-medium transition-colors",
                                                            client.client_email ? "text-white" : "text-muted-foreground italic text-sm"
                                                        )}>
                                                            {client.client_email || "No email assigned"}
                                                        </span>
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="py-6 px-8 text-right">
                                                {editingId === client.id ? (
                                                    <div className="flex items-center justify-end gap-2 animate-in zoom-in duration-300">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={handleCancel}
                                                            className="rounded-xl h-9 w-9 p-0 hover:bg-white/5 text-muted-foreground"
                                                        >
                                                            <X size={16} />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleSave(client.id)}
                                                            disabled={isSaving}
                                                            className="rounded-xl h-9 bg-primary text-white hover:shadow-glow transition-all"
                                                        >
                                                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="mr-2" />}
                                                            Save
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleEdit(client)}
                                                        className="rounded-xl h-9 px-4 hover:bg-white/5 text-muted-foreground hover:text-primary transition-all group/btn"
                                                    >
                                                        <Edit2 size={14} className="mr-2 group-hover/btn:scale-110 transition-transform" />
                                                        Edit Contact
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Info Footer */}
            <div className="flex items-center gap-4 p-6 rounded-3xl bg-primary/5 border border-primary/10">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                    <AlertCircle size={24} />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-bold text-white uppercase tracking-wider italic">Administrative Note</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        These emails are used for internal communications and MIS report distribution.
                        Changes made here <span className="text-white font-bold italic underline">do not affect</span> the company's profile within QuickBooks Online.
                    </p>
                </div>
            </div>
        </div>
    );
}
