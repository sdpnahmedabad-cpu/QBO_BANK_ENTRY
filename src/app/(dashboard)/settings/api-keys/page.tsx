"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Key, Copy, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { getApiKeys, generateApiKey, revokeApiKey } from "./actions";

export default function ApiKeysPage() {
    const { selectedCompany } = useStore();
    const [apiKeys, setApiKeys] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [justGeneratedToken, setJustGeneratedToken] = useState<string | null>(null);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    useEffect(() => {
        if (selectedCompany?.id) {
            loadApiKeys();
        } else {
            setIsLoading(false);
        }
    }, [selectedCompany?.id]);

    const loadApiKeys = async () => {
        setIsLoading(true);
        try {
            const keys = await getApiKeys(selectedCompany.id);
            setApiKeys(keys);
        } catch (error) {
            console.error("Failed to load API keys", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!newKeyName.trim() || !selectedCompany?.id) return;

        setIsGenerating(true);
        try {
            const newKey = await generateApiKey(selectedCompany.id, newKeyName.trim());
            setApiKeys([newKey, ...apiKeys]);
            setJustGeneratedToken(newKey.token);
            setNewKeyName("");
        } catch (error: any) {
            alert(error.message || "Failed to generate key");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRevoke = async (id: string) => {
        if (!confirm("Are you sure you want to revoke this API key? This cannot be undone and any integrations using it will instantly fail.")) return;

        try {
            await revokeApiKey(id);
            setApiKeys(apiKeys.map(k => k.id === id ? { ...k, is_active: false } : k));
        } catch (error: any) {
            alert(error.message || "Failed to revoke key");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedToken(text);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!selectedCompany?.id) {
        return (
            <div className="p-10 text-center">
                <h2 className="text-xl font-medium">Please select a company first</h2>
                <p className="text-muted-foreground mt-2">API keys are tied to specific companies.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Key className="h-6 w-6 text-primary" />
                        API Integrations
                    </h1>
                    <p className="text-muted-foreground">Manage API keys to let external software connect to Finza securely.</p>
                </div>
            </div>

            {/* Generate New Key Section */}
            <Card className="glass border-primary/20 bg-primary/5">
                <CardHeader>
                    <CardTitle className="text-lg">Generate New API Key</CardTitle>
                    <CardDescription>
                        Tokens provide full read/write access to this company's Finza account and QBO connection via Finza's public API. Treat them like passwords.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 items-end">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <label htmlFor="keyName" className="text-sm font-medium">Integration Name</label>
                            <Input
                                id="keyName"
                                placeholder="e.g. N8N Webhook, Salesforce Sync"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                className="bg-black/20"
                            />
                        </div>
                        <Button onClick={handleGenerate} disabled={!newKeyName.trim() || isGenerating} className="glow-primary">
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Create Key
                        </Button>
                    </div>

                    {justGeneratedToken && (
                        <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                            <h3 className="text-green-400 font-semibold flex items-center gap-2 mb-2">
                                <CheckCircle2 className="h-5 w-5" />
                                Key Generated Successfully
                            </h3>
                            <p className="text-sm text-foreground mb-4">
                                Please copy this token now. <strong>You will not be able to see it again!</strong>
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="bg-black/50 px-4 py-2 rounded border border-white/10 font-mono text-lg flex-1 overflow-x-auto">
                                    {justGeneratedToken}
                                </code>
                                <Button
                                    variant="outline"
                                    className="bg-black/20 hover:bg-white/10"
                                    onClick={() => copyToClipboard(justGeneratedToken)}
                                >
                                    {copiedToken === justGeneratedToken ? "Copied!" : <><Copy className="h-4 w-4 mr-2" /> Copy</>}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Existing Keys */}
            <h2 className="text-xl font-semibold mt-10 mb-4">Active API Keys</h2>

            <div className="space-y-3">
                {apiKeys.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-white/10 rounded-lg bg-black/10">
                        <p className="text-muted-foreground">No API keys generated yet for {selectedCompany.name}.</p>
                    </div>
                ) : (
                    apiKeys.map((key) => (
                        <Card key={key.id} className={`glass border-white/10 ${!key.is_active ? 'opacity-50' : ''}`}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-medium text-foreground">{key.name}</h3>
                                        {!key.is_active && (
                                            <span className="text-[10px] uppercase font-bold tracking-wider bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                                                Revoked
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                        <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                                        <span>Last Used: {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}</span>
                                        <span className="font-mono">Token: finza_live_••••••••</span>
                                    </div>
                                </div>

                                {key.is_active && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        onClick={() => handleRevoke(key.id)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Revoke
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
