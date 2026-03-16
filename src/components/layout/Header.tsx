"use client";

import { useStore } from "@/store/useStore";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PlusCircle, LogOut, User as UserIcon, Building2, Settings } from "lucide-react";

export function Header() {
    const { user, setUser, logout, selectedCompany, setCompany, connectedCompanies, setConnectedCompanies } = useStore();
    const [qboStatus, setQboStatus] = useState<{ isConnected: boolean, lastSync?: string, companyName?: string }>({ isConnected: false });
    const [isLoading, setIsLoading] = useState(true);
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    const checkStatus = useCallback(async () => {
        if (!user || !selectedCompany?.id) {
            setIsLoading(false);
            return;
        }
        try {
            const res = await fetch(`/api/qbo/status?companyId=${selectedCompany.id}`);
            if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
                throw new Error('Invalid response from status API');
            }
            const data = await res.json();

            let companyName = "";
            let isConnected = data.isConnected;

            if (isConnected) {
                try {
                    const infoRes = await fetch(`/api/qbo/company-info?companyId=${selectedCompany.id}`);

                    if (infoRes.status === 401) {
                        console.warn("QBO Token invalid/expired - marking as disconnected");
                        isConnected = false;
                    } else if (infoRes.status === 503) {
                        // Service temporarily unavailable (connection reset)
                        console.warn("QBO temporarily unavailable - using fallback company name");
                        companyName = selectedCompany.name || "Connected Company";
                    } else if (!infoRes.ok || !infoRes.headers.get('content-type')?.includes('application/json')) {
                        const errText = await infoRes.text();
                        console.error('Company Info API failed:', infoRes.status, errText);
                        companyName = selectedCompany.name || "Connected Company";
                    } else {
                        const infoData = await infoRes.json();
                        companyName = infoData.CompanyInfo?.CompanyName || selectedCompany.name || "QuickBooks Company";
                    }
                } catch (e) {
                    console.error("Failed to fetch company info", e);
                    // Use the stored company name as fallback
                    companyName = selectedCompany.name || "Connected Company";
                }
            }

            setQboStatus({
                isConnected: isConnected,
                lastSync: data.lastSync,
                companyName: companyName
            });
        } catch (error) {
            console.error('Failed to check QBO status', error);
        } finally {
            setIsLoading(false);
        }
    }, [user, selectedCompany?.id, selectedCompany?.name, setQboStatus, setIsLoading]);

    const fetchCompanies = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch('/api/qbo/companies');
            if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
                const companies = await res.json();
                setConnectedCompanies(companies);

                if (companies.length > 0) {
                    // Select first company if none selected or if current selection is invalid
                    if (!selectedCompany.id || !companies.find((c: any) => c.id === selectedCompany.id)) {
                        setCompany(companies[0]);
                    }
                } else {
                    // Clear selected company if no companies are connected
                    setCompany({ id: '', name: '' });
                }
            }
        } catch (error) {
            console.error("Failed to fetch companies", error);
        }
    }, [user, selectedCompany.id, setConnectedCompanies, setCompany]);

    // Unified side effect management
    useEffect(() => {
        let isMounted = true;

        const initializeData = async () => {
            // 1. Initial User Session
            if (!user) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Fetch role from profiles
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role, firm_name')
                        .eq('id', user.id)
                        .single();

                    setUser({
                        id: user.id,
                        email: user.email || '',
                        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
                        firm_name: profile?.firm_name || '',
                        role: profile?.role as 'admin' | 'coworker'
                    });

                    // Proceed with other fetches only after user is set
                    await Promise.all([
                        fetchCompanies(),
                        checkStatus()
                    ]);
                } else {
                    setUser(null);
                    if (isMounted) setIsLoading(false);
                }
            } else if (user && user.firm_name === undefined) {
                // If user is in store but missing firm_name (e.g. after code update)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, firm_name')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    setUser({
                        ...user,
                        firm_name: profile.firm_name || '',
                        role: profile.role as 'admin' | 'coworker'
                    });
                }
            }

            // 2. Refresh companies and status
            if (user && isMounted) {
                await Promise.all([
                    fetchCompanies(),
                    checkStatus()
                ]);
            }
        };

        initializeData();
        return () => { isMounted = false; };
    }, [user?.id, fetchCompanies, checkStatus]); // Removed supabase.auth as dependency

    // Separate effect for status to avoid redundant company fetches
    useEffect(() => {
        if (user && selectedCompany?.id) {
            checkStatus();
        }
    }, [user?.id, selectedCompany?.id, checkStatus]);

    const handleConnect = () => {
        console.log('Header Connect button clicked - redirecting to OAuth...');
        window.location.href = '/api/auth/qbo';
    };

    const handleDisconnect = async (realmId?: string) => {
        const idToDisconnect = realmId || selectedCompany.id;
        if (!idToDisconnect) return;

        if (!confirm(`Are you sure you want to disconnect ${realmId ? 'this company' : selectedCompany.name}?`)) return;

        setIsLoading(true);
        try {
            await useStore.getState().disconnectCompany(idToDisconnect);
            // After store update, we might still want to manually update local qboStatus if needed
            // but the store update will trigger re-renders in components that use it.
            setQboStatus({ isConnected: false, companyName: undefined });
            await checkStatus();
        } catch (error) {
            console.error('Failed to disconnect', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogOut = async () => {
        setIsLoading(true);
        try {
            await supabase.auth.signOut();
            await logout(); // Clear store
            router.push('/login');
            router.refresh();
        } catch (error) {
            console.error('Logout failed', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <header className="h-16 border-b border-white/10 glass flex items-center justify-between px-6 sticky top-0 z-10 relative">
            {/* Gradient border bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

            {/* Left: Branding & QBO Connection */}
            <div className="flex items-center gap-4">
                <div className="flex flex-col animate-fade-in">
                    <h1 className="text-lg font-bold gradient-text tracking-tight">Finza</h1>
                </div>

                {/* Company Selector */}
                <div className="hidden md:flex items-center gap-2">
                    <Select value={selectedCompany.id} onValueChange={(val) => {
                        const company = connectedCompanies.find(c => c.id === val);
                        if (company) setCompany(company);
                    }}>
                        <SelectTrigger className="min-w-[220px] max-w-[400px] h-9 text-sm bg-white/5 border-white/10 focus:ring-primary/20 transition-all hover:bg-white/10">
                            <SelectValue placeholder="Select Company" />
                        </SelectTrigger>
                        <SelectContent className="glass-strong border-white/10 min-w-[220px]">
                            {connectedCompanies.map(company => (
                                <SelectItem
                                    key={company.id}
                                    value={company.id}
                                    textValue={company.name}
                                    className="text-sm py-2 group"
                                >
                                    <div className="flex items-center gap-3 w-full">
                                        <span className="font-medium truncate max-w-[180px]">{company.name}</span>
                                        <span className="text-[10px] text-muted-foreground/40 font-mono shrink-0 opacity-0 group-hover:opacity-100 group-data-[state=checked]:opacity-100 transition-opacity">
                                            ({company.id})
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="h-8 w-px bg-white/20 mx-2 hidden md:block" />

                {/* QBO Connection Button & Status */}
                <div className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    {qboStatus.isConnected ? (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDisconnect();
                                }}
                                size="sm"
                                className="glass border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-medium transition-smooth h-9"
                                disabled={isLoading}
                            >
                                <LogOut className="mr-2 h-3.5 w-3.5" />
                                Disconnect {selectedCompany.name.split(' ')[0]}
                            </Button>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass border border-green-500/30 animate-pulse-glow">
                                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-xs font-semibold text-green-400">Connected</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <Button
                                type="button"
                                variant="default"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleConnect();
                                }}
                                className="gradient-primary hover:opacity-90 text-white font-medium transition-smooth hover-scale shadow-lg"
                                disabled={isLoading}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Connect to QuickBooks
                            </Button>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass border border-white/10">
                                <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                                <span className="text-xs font-semibold text-muted-foreground">Disconnected</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Right: User Profile */}
            <div className="flex items-center gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <ThemeToggle />

                <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-foreground">{user?.firm_name || user?.name || 'Loading...'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full hover-scale transition-smooth">
                            <Avatar className="h-10 w-10 border-2 border-primary/50 shadow-lg">
                                <AvatarImage src="/avatars/user.png" alt={user?.name || ''} />
                                <AvatarFallback className="gradient-primary text-white font-bold">
                                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 glass-strong border-white/10" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none text-foreground">{user?.firm_name || user?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem className="hover:bg-white/5 transition-smooth cursor-pointer">
                            <UserIcon className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-white/5 transition-smooth cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem
                            onClick={handleLogOut}
                            className="text-red-400 hover:bg-red-500/10 transition-smooth cursor-pointer"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
