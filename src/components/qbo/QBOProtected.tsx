"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

interface QBOProtectedProps {
    children: React.ReactNode;
}

export function QBOProtected({ children }: QBOProtectedProps) {
    const [isConnected, setIsConnected] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const res = await fetch('/api/qbo/status');
            const data = await res.json();
            setIsConnected(data.isConnected);
        } catch (error) {
            console.error('Failed to check status', error);
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = () => {
        window.location.href = '/api/auth/qbo';
    };

    if (isLoading) {
        return <div className="p-4 text-center text-slate-500">Loading QBO status...</div>;
    }

    if (!isConnected) {
        return (
            <Card className="border-dashed border-2 bg-slate-50">
                <CardHeader className="text-center">
                    <CardTitle>QuickBooks Connection Required</CardTitle>
                    <CardDescription>
                        Please connect your QuickBooks Online account to view live data.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pb-8">
                    <Button onClick={handleConnect} className="bg-[#2CA01C] hover:bg-[#238016]">
                        <RefreshCw className="mr-2 h-4 w-4" /> Connect to QuickBooks
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return <>{children}</>;
}
