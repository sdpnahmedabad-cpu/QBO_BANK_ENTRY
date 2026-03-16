"use client";

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogIn, UserPlus, Mail, Lock, Loader2, Building2 } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
        });

        if (error) {
            setError(error.message);
            setIsLoading(false);
        } else {
            router.push('/');
            router.refresh();
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const cleanEmail = email.trim().toLowerCase();

            const { data, error: signUpError } = await supabase.auth.signUp({
                email: cleanEmail,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (signUpError) {
                if (signUpError.message.includes("already registered")) {
                    setError("This account already exists! Please go to the 'Login' tab to sign in.");
                } else {
                    setError(signUpError.message);
                }
                setIsLoading(false);
            } else if (data.user && data.session) {
                // If email confirmation is OFF, they are logged in immediately
                router.push('/');
            } else {
                setError("Success! If you don't receive a confirmation email, ask your Admin to check the Supabase settings.");
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error("SignUp unexpected error:", err);
            setError(`Registration Error: ${err.message || "An unexpected error occurred"}`);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a] relative overflow-hidden">
            {/* Dynamic Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

            <div className="w-full max-w-md relative animate-in fade-in zoom-in duration-500">
                <div className="flex flex-col items-center mb-8">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-blue-600 shadow-xl mb-4">
                        <Building2 className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold gradient-text">Finza</h1>
                    <p className="text-muted-foreground text-sm mt-1 uppercase tracking-widest font-semibold">Accounting Intelligence</p>
                </div>

                <Card className="glass-strong border-white/10 shadow-2xl">
                    <Tabs defaultValue="login" className="w-full">
                        <CardHeader>
                            <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10">
                                <TabsTrigger value="login" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">Login</TabsTrigger>
                                <TabsTrigger value="signup" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">Sign Up</TabsTrigger>
                            </TabsList>
                        </CardHeader>

                        <CardContent>
                            {error && (
                                <div className={`p-3 rounded-md text-xs font-medium mb-4 animate-in slide-in-from-top-2 ${error.includes('Success') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                    {error}
                                </div>
                            )}

                            <TabsContent value="login">
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                type="email"
                                                autoComplete="username"
                                                placeholder="admin@firm.com"
                                                className="pl-10 bg-white/5 border-white/10 h-11 focus:ring-primary/20"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="password"
                                                type="password"
                                                autoComplete="current-password"
                                                className="pl-10 bg-white/5 border-white/10 h-11 focus:ring-primary/20"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full h-11 gradient-primary hover:opacity-90 font-semibold" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogIn className="mr-2 h-4 w-4" /> Sign In</>}
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="signup">
                                <form onSubmit={handleSignUp} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="signup-email">Email Address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signup-email"
                                                type="email"
                                                autoComplete="email"
                                                placeholder="name@example.com"
                                                className="pl-10 bg-white/5 border-white/10 h-11 focus:ring-primary/20"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="signup-password">Create Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signup-password"
                                                type="password"
                                                autoComplete="new-password"
                                                placeholder="••••••••"
                                                className="pl-10 bg-white/5 border-white/10 h-11 focus:ring-primary/20"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-2">
                                        <p className="text-[10px] text-primary/70 leading-relaxed uppercase tracking-wider font-bold italic">
                                            Note: The first person to register on this instance will be granted full Administrative access.
                                        </p>
                                    </div>
                                    <Button type="submit" className="w-full h-11 gradient-primary hover:opacity-90 font-semibold" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="mr-2 h-4 w-4" /> Create Account</>}
                                    </Button>
                                </form>
                            </TabsContent>
                        </CardContent>

                        <CardFooter className="flex flex-col gap-4">
                            <div className="text-center w-full">
                                <p className="text-xs text-muted-foreground">
                                    By continuing, you agree to our Terms of Service and Privacy Policy.
                                </p>
                            </div>
                        </CardFooter>
                    </Tabs>
                </Card>
            </div>
        </div>
    );
}
