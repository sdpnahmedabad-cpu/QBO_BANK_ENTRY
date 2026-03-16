import { KPICards } from "@/components/dashboard/KPICards";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { ExpenseChart } from "@/components/dashboard/ExpenseChart";
import { QBOProtected } from "@/components/qbo/QBOProtected";
import { Button } from "@/components/ui/button";
import { FileStack, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <QBOProtected>
      <div className="space-y-8">
        {/* 1. Top Section: Key Performance Indicators */}
        <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <KPICards />
        </section>

        {/* 2. Middle Section: Charts & Status */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          {/* Main Chart - Takes 2 columns */}
          <div className="lg:col-span-2">
            <CashFlowChart />
          </div>

          {/* Side Panel - Quick Actions & Expense Split */}
          <div className="space-y-6">
            <div className="glass p-6 rounded-2xl border-white/10 space-y-4">
              <h3 className="text-lg font-bold text-foreground flex items-center">
                <FileStack size={20} className="mr-2 text-primary" />
                Bulk Posting
              </h3>
              <p className="text-sm text-muted-foreground">
                Upload Excel templates to post Journal Entries, Invoices, and Bills in seconds.
              </p>
              <Link href="/bulk-entries" className="block">
                <Button className="w-full bg-primary/10 hover:bg-primary/20 text-primary border-primary/20">
                  Go to Bulk Post
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
            </div>
            <ExpenseChart />
          </div>
        </section>
      </div>
    </QBOProtected>
  );
}
