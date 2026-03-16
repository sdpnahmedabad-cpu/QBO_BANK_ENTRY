"use client";

import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ParticleBackground } from "@/components/effects/ParticleBackground";

interface LayoutProps {
    children: ReactNode;
}

export function AppLayout({ children }: LayoutProps) {
    return (
        <div className="flex h-screen bg-background overflow-hidden relative">
            {/* Particle Background */}
            <ParticleBackground />

            {/* Gradient Overlay for depth */}
            <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none z-0" />

            {/* Sidebar */}
            <div className="relative z-10">
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 relative z-10">
                {/* Header */}
                <Header />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    <div className="mx-auto max-w-7xl animate-fade-in">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
