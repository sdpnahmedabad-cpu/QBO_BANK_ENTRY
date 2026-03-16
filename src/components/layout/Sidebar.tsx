"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import {
    LayoutDashboard,
    Upload,
    PieChart,
    FileText,
    Users,
    CreditCard,
    Settings,
    Settings2,
    Database,
    RefreshCw,
    ShieldCheck,
    FileStack,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MENU_ITEMS = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/" },
    { label: "Post Bank Entries", icon: Upload, href: "/bank-entries" },
    { label: "MIS Reports", icon: PieChart, href: "/reports/mis" },
    { label: "Financial Statements", icon: FileText, href: "/reports/financials" },
    { label: "Debtors Ageing", icon: Users, href: "/reports/debtors" },
    { label: "Creditors Outstanding", icon: CreditCard, href: "/reports/creditors" },
    { label: "Rules Engine", icon: Settings, href: "/rules" },
    { label: "Master Rule", icon: ShieldCheck, href: "/master-rules" },
    { label: "Post Bulk Entries", icon: FileStack, href: "/bulk-entries" },
    { label: "Set-up Company", icon: Settings2, href: "/setup-company", adminOnly: true },
    { label: "Settings", icon: Settings, href: "/settings" },
];

export function Sidebar() {
    const pathname = usePathname();
    const { sidebarOpen, toggleSidebar } = useStore();

    return (
        <div
            className={cn(
                "h-screen glass-strong text-foreground transition-all duration-300 flex flex-col border-r border-white/10 relative",
                sidebarOpen ? "w-64" : "w-16"
            )}
        >
            {/* Gradient accent border */}
            <div className="absolute top-0 right-0 w-[2px] h-full bg-gradient-to-b from-primary via-accent to-transparent opacity-50" />

            {/* Sidebar Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
                {sidebarOpen && (
                    <span className="font-bold text-xl tracking-wide gradient-text animate-fade-in">
                        Finza
                    </span>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className="text-muted-foreground hover:text-foreground hover-scale transition-smooth"
                >
                    {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
                {MENU_ITEMS.map((item, index) => {
                    const isActive = pathname === item.href;
                    // @ts-ignore
                    const isAdmin = useStore.getState().user?.role === 'admin';

                    if (item.adminOnly && !isAdmin) return null;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center px-3 py-3 text-sm transition-smooth group relative rounded-lg stagger-item",
                                isActive
                                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg glow-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            )}
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <item.icon
                                size={20}
                                className={cn(
                                    "shrink-0 transition-smooth",
                                    sidebarOpen && "mr-3",
                                    isActive && "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                                )}
                            />
                            {sidebarOpen && (
                                <span className="font-medium animate-fade-in">{item.label}</span>
                            )}

                            {/* Tooltip for collapsed state */}
                            {!sidebarOpen && (
                                <div className="absolute left-full ml-3 px-3 py-2 glass-strong text-foreground text-xs rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none transition-smooth shadow-xl">
                                    {item.label}
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-white/10 rotate-45" />
                                </div>
                            )}

                            {/* Active indicator */}
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full animate-scale-in" />
                            )}
                        </Link>
                    );
                })}

            </nav>

            {/* Footer / Version */}
            {sidebarOpen && (
                <div className="p-4 border-t border-white/10">
                    <div className="glass rounded-lg p-3 text-center animate-fade-in">
                        <p className="text-xs text-muted-foreground font-medium">Version</p>
                        <p className="text-sm font-bold gradient-text">v1.0.0 Alpha</p>
                    </div>
                </div>
            )}
        </div>
    );
}
