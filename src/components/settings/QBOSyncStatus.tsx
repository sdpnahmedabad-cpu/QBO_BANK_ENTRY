"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, RefreshCw, LogOut } from "lucide-react";
import { useStore } from "@/store/useStore";

export function QBOSyncStatus() {
    const { selectedCompany } = useStore();
    const disconnectCompany = useStore(state => state.disconnectCompany);

    const [isConnected, setIsConnected] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkStatus();
    }, [selectedCompany.id]);

    const checkStatus = async () => {
        if (!selectedCompany.id) {
            setIsConnected(false);
            setLastSync(null);
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch(`/api/qbo/status?companyId=${selectedCompany.id}`);
            const data = await res.json();
            setIsConnected(data.isConnected);
            setLastSync(data.lastSync);
        } catch (error) {
            console.error('Failed to check status', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = () => {
        window.location.href = '/api/auth/qbo';
    };

    const handleDisconnect = async () => {
        console.log('=== DISCONNECT BUTTON CLICKED ===');
        console.log('Current connection state:', { isConnected, hasCompanyId: !!selectedCompany?.id, companyId: selectedCompany?.id });

        if (!isConnected) {
            console.log('Not connected, nothing to disconnect');
            return;
        }

        console.log('Showing confirmation dialog...');
        if (!confirm('Are you sure you want to disconnect from QuickBooks?')) {
            console.log('User cancelled disconnect');
            return;
        }

        console.log('User confirmed, starting disconnect process...');
        try {
            setIsLoading(true);

            // Try to disconnect using the store if we have a company ID
            if (selectedCompany?.id) {
                console.log('Disconnecting via store with company ID:', selectedCompany.id);
                await disconnectCompany(selectedCompany.id);
            } else {
                console.log('Disconnecting via direct API call (no company ID in store)');
                // Fallback: call the API directly without company ID
                const res = await fetch('/api/qbo/disconnect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });

                console.log('API response status:', res.status);
                if (!res.ok) {
                    throw new Error('Failed to disconnect');
                }
            }

            console.log('Disconnect successful, refreshing status...');
            // Refresh status
            await checkStatus();

            console.log('Reloading page...');
            // Reload page to refresh all data
            window.location.reload();
        } catch (error) {
            console.error('Failed to disconnect', error);
            alert('Failed to disconnect. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>QuickBooks Connection</CardTitle>
                <CardDescription>Manage your connection to QuickBooks Online</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full ${isConnected ? 'bg-green-100' : 'bg-slate-100'}`}>
                            {isConnected ? (
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                            ) : (
                                <AlertCircle className="h-6 w-6 text-slate-400" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">
                                    {isConnected ? 'Connected to QuickBooks' : 'Not Connected'}
                                </p>
                                <Badge variant="outline" className="text-[10px] h-5 border-slate-300">
                                    {process.env.NEXT_PUBLIC_QBO_ENVIRONMENT === 'production' ? 'LIVE' : 'SANDBOX'}
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500">
                                {isConnected
                                    ? `Last authenticated: ${lastSync ? new Date(lastSync).toLocaleDateString() : 'Just now'}`
                                    : 'Connect to sync your bank entries directly.'
                                }
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {isConnected ? (
                            <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={isLoading} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                <LogOut className="mr-2 h-4 w-4" /> Disconnect
                            </Button>
                        ) : (
                            <Button variant="default" size="sm" onClick={handleConnect} disabled={isLoading} className="bg-[#2CA01C] hover:bg-[#238016]">
                                <RefreshCw className="mr-2 h-4 w-4" /> Connect to QuickBooks
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
