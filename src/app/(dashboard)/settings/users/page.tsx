'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus, Trash2, Mail, Lock, Shield, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { addCoworker, deleteUser } from './actions';
import { useStore } from '@/store/useStore';

interface Profile {
    id: string;
    email: string;
    role: 'admin' | 'coworker';
    created_at: string;
}

export default function UserManagementPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const supabase = createClient();
    const currentUser = useStore(state => state.user);

    const fetchProfiles = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            setError(error.message);
        } else {
            setProfiles(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            await addCoworker(email, password);
            setEmail('');
            setPassword('');
            await fetchProfiles();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Are you sure you want to remove this user?')) return;

        try {
            await deleteUser(userId);
            await fetchProfiles();
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (currentUser?.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4 animate-in fade-in zoom-in duration-500">
                <Shield className="h-16 w-16 text-muted-foreground opacity-20" />
                <h1 className="text-xl font-semibold text-muted-foreground font-display">Administrative Access Only</h1>
                <p className="text-sm text-muted-foreground/60 max-w-sm text-center">
                    This section is reserved for the primary administrator. Please contact your manager if you believe this is an error.
                </p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-5xl space-y-8 animate-in fade-in duration-700">
            <header className="flex flex-col gap-1">
                <div className="flex items-center gap-2 mb-2">
                    <Link href="/settings" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                        <ArrowLeft size={14} />
                        Back to Settings
                    </Link>
                </div>
                <h1 className="text-3xl font-bold font-display tracking-tight gradient-text">Manage Users</h1>
                <p className="text-muted-foreground">Manage administrative and coworkers access for this instance.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* User List */}
                <Card className="lg:col-span-2 glass-strong border-white/10 shadow-xl overflow-hidden">
                    <CardHeader className="border-b border-white/5 bg-white/5">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Active Personnel</CardTitle>
                        </div>
                        <CardDescription>Accounts authorized to access this dashboard.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center p-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                                            <th className="px-6 py-4">Email</th>
                                            <th className="px-6 py-4">Role</th>
                                            <th className="px-6 py-4">Joined</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {profiles.map((profile) => (
                                            <tr key={profile.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4 text-sm font-medium">{profile.email}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${profile.role === 'admin'
                                                        ? 'bg-primary/10 text-primary border-primary/20'
                                                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                        }`}>
                                                        {profile.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-muted-foreground">
                                                    {new Date(profile.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {profile.id !== currentUser.id && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(profile.id)}
                                                            className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all hover-scale"
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Add User Form */}
                <Card className="glass-strong border-white/10 shadow-xl self-start">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-accent" />
                            <CardTitle className="text-lg">Add Coworker</CardTitle>
                        </div>
                        <CardDescription>Create a new account for a team member.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-in slide-in-from-top-2">
                                <AlertCircle size={14} className="shrink-0" />
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs uppercase tracking-wider opacity-70">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-50" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="coworker@firm.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 h-11 bg-white/5 border-white/10 focus:ring-primary/20 transition-all"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-xs uppercase tracking-wider opacity-70">Temporary Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-50" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 h-11 bg-white/5 border-white/10 focus:ring-primary/20 transition-all"
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full h-11 gradient-primary hover:opacity-90 font-bold tracking-wide" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create User'}
                            </Button>
                            <p className="text-[10px] text-muted-foreground/60 text-center px-4 leading-relaxed italic mt-4">
                                The new member will receive their role automatically as a 'coworker' and can log in immediately.
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
