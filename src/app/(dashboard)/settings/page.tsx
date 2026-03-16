"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QBOSyncStatus } from "@/components/settings/QBOSyncStatus";
import { getProfile, updateFirmDetails } from "./actions";
import { Loader2, Save, Users, ArrowRight, Database } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/store/useStore";

export default function SettingsPage() {
    const [firmName, setFirmName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const currentUser = useStore(state => state.user);
    const setUser = useStore(state => state.setUser);

    useEffect(() => {
        async function loadProfile() {
            const profile = await getProfile();
            if (profile) {
                setFirmName(profile.firm_name || "");
                setAdminEmail(profile.admin_email_display || profile.email || "");
            }
            setIsLoading(false);
        }
        loadProfile();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            await updateFirmDetails(firmName, adminEmail);

            // Update the global store so the header updates immediately
            if (currentUser) {
                setUser({
                    ...currentUser,
                    firm_name: firmName
                });
            }

            setMessage({ type: 'success', text: 'Firm details updated successfully!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to update firm details' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h1 className="text-2xl font-bold text-foreground gradient-text">Settings</h1>

            <div className="max-w-2xl space-y-6">
                {/* QuickBooks Section */}
                <QBOSyncStatus />

                {/* Firm Profile Section */}
                <Card className="glass border-white/10 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-foreground">Firm Profile</CardTitle>
                        <CardDescription className="text-muted-foreground">Manage your firm's identity and primary contact.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {message && (
                            <div className={`p-3 rounded-lg text-xs border ${message.type === 'success'
                                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                                }`}>
                                {message.text}
                            </div>
                        )}

                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="firmName" className="text-muted-foreground px-1">Firm Name</Label>
                            <Input
                                type="text"
                                id="firmName"
                                value={firmName}
                                onChange={(e) => setFirmName(e.target.value)}
                                placeholder="e.g. Finza AI"
                                className="bg-black/20 border-white/10 text-foreground h-11 focus:ring-primary/20"
                            />
                        </div>
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="email" className="text-muted-foreground px-1">Admin Email</Label>
                            <Input
                                type="email"
                                id="email"
                                value={adminEmail}
                                onChange={(e) => setAdminEmail(e.target.value)}
                                placeholder="admin@firm.com"
                                className="bg-black/20 border-white/10 text-foreground h-11 focus:ring-primary/20"
                            />
                        </div>
                        <Button
                            className="glow-primary w-full h-11 font-bold"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Save Changes
                        </Button>
                    </CardContent>
                </Card>

                {/* Admin Management Section */}
                {currentUser?.role === 'admin' && (
                    <div className="space-y-4">
                        <h2 className="text-sm font-black uppercase tracking-widest text-primary italic ml-1">Administration</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Manage Clients */}
                            <Card className="glass-strong border-white/10 shadow-xl overflow-hidden hover:border-primary/30 transition-colors group">
                                <Link href="/manage-clients">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-5 w-5 text-primary" />
                                                <CardTitle className="text-lg">Manage Clients</CardTitle>
                                            </div>
                                            <CardDescription>Setup client emails and manage connections.</CardDescription>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-muted-foreground opacity-50 group-hover:translate-x-1 transition-transform" />
                                    </CardHeader>
                                </Link>
                            </Card>

                            {/* API Keys */}
                            <Card className="glass-strong border-white/10 shadow-xl overflow-hidden hover:border-primary/30 transition-colors group">
                                <Link href="/settings/api-keys">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Database className="h-5 w-5 text-primary" />
                                                <CardTitle className="text-lg">API Integrations</CardTitle>
                                            </div>
                                            <CardDescription>Manage keys for 3rd party access.</CardDescription>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-muted-foreground opacity-50 group-hover:translate-x-1 transition-transform" />
                                    </CardHeader>
                                </Link>
                            </Card>

                            {/* Master COA */}
                            <Card className="glass-strong border-white/10 shadow-xl overflow-hidden hover:border-primary/30 transition-colors group">
                                <Link href="/master-coa">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Database className="h-5 w-5 text-accent" />
                                                <CardTitle className="text-lg">Master COA</CardTitle>
                                            </div>
                                            <CardDescription>Global industry Chart of Account templates.</CardDescription>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-muted-foreground opacity-50 group-hover:translate-x-1 transition-transform" />
                                    </CardHeader>
                                </Link>
                            </Card>

                            {/* Manage Team */}
                            <Card className="glass-strong border-white/10 shadow-xl overflow-hidden hover:border-primary/30 transition-colors group md:col-span-2">
                                <Link href="/settings/users">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-5 w-5 text-accent" />
                                                <CardTitle className="text-lg">Manage Team</CardTitle>
                                            </div>
                                            <CardDescription>Add coworkers and manage access roles.</CardDescription>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-muted-foreground opacity-50 group-hover:translate-x-1 transition-transform" />
                                    </CardHeader>
                                </Link>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
