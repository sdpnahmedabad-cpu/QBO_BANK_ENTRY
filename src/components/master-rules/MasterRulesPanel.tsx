
"use client";

import { useState, useEffect } from "react";
import { useStore, MasterRule, RuleCondition, TransactionType } from "@/store/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, X, Save, Users, ArrowRight } from "lucide-react";
import { RuleBuilder } from "@/components/rules/RuleBuilder";

const TRANSACTION_TYPES: TransactionType[] = [
    'Expense', 'Income', 'Transfer', 'Check', 'Bill', 'Purchase', 'Credit Card Credit', 'Credit Note'
];


export function MasterRulesPanel() {
    const { masterRules, contacts, addMasterRule, deleteMasterRule, editMasterRule, addRule, connectedCompanies } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [ruleName, setRuleName] = useState("");
    const [ledger, setLedger] = useState("");
    const [ruleType, setRuleType] = useState<TransactionType>('Expense');
    const [contactId, setContactId] = useState<string>("");

    // Advanced Rule State
    const [conditions, setConditions] = useState<RuleCondition[]>([
        { id: '1', field: 'Description', operator: 'contains', value: '' }
    ]);
    const [matchType, setMatchType] = useState<'AND' | 'OR'>('AND');

    // Clients Application State
    const [selectedClients, setSelectedClients] = useState<string[]>([]);

    const [accounts, setAccounts] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);

    useEffect(() => {
        const fetchQBOData = async () => {
            try {
                const [accRes, venRes, cusRes] = await Promise.all([
                    fetch('/api/qbo/accounts'), // Fetch all accounts
                    fetch('/api/qbo/vendors'),
                    fetch('/api/qbo/customers')
                ]);

                if (accRes.ok) {
                    const data = await accRes.json();
                    setAccounts(data.QueryResponse?.Account || []);
                }
                if (venRes.ok) {
                    const data = await venRes.json();
                    setVendors(data.QueryResponse?.Vendor || []);
                }
                if (cusRes.ok) {
                    const data = await cusRes.json();
                    setCustomers(data.QueryResponse?.Customer || []);
                }
            } catch (error) {
                console.error("Failed to fetch QBO data", error);
            }
        };
        fetchQBOData();
    }, []);

    // Filtered lists based on Type
    const incomeAccounts = accounts.filter(a => a.Classification === 'Revenue' || a.AccountType === 'Income' || a.AccountType === 'Other Income');
    const expenseAccounts = accounts.filter(a => a.Classification === 'Expense' || a.AccountType === 'Expense' || a.AccountType === 'Other Expense' || a.AccountType === 'Cost of Goods Sold');
    const bankAccounts = accounts.filter(a => a.AccountType === 'Bank' || a.AccountType === 'Credit Card'); // For transfers

    const getLedgerOptions = () => {
        if (ruleType === 'Income') return incomeAccounts;
        if (ruleType === 'Transfer') return bankAccounts;
        return expenseAccounts.length > 0 ? expenseAccounts : accounts; // Default to Expense or All if filtering fails
    };

    const resetForm = () => {
        setRuleName("");
        setLedger("");
        setRuleType('Expense');
        setContactId("");
        setConditions([{ id: Math.random().toString(36).substr(2, 9), field: 'Description', operator: 'contains', value: '' }]);
        setMatchType('AND');
        setSelectedClients([]);
        setIsAdding(false);
        setEditingId(null);
    };

    const handleSave = () => {
        if (!ruleName || !ledger || conditions.length === 0) return;

        const ruleData = {
            rule_name: ruleName,
            conditions,
            matchType,
            rule_type: ruleType,
            actions: {
                ledger,
                contactId: contactId || undefined,
            },
            appliedClientIds: selectedClients
        };

        if (editingId) {
            editMasterRule(editingId, ruleData);
        } else {
            addMasterRule(ruleData);
        }

        if (!editingId && selectedClients.length > 0) {
            selectedClients.forEach(clientId => {
                addRule({
                    client_id: clientId,
                    rule_name: `[Master] ${ruleName}`,
                    conditions,
                    matchType,
                    rule_type: ruleType,
                    actions: {
                        ledger,
                        contactId: contactId || undefined,
                    },
                    is_active: true
                });
            });
        }

        resetForm();
    };

    const startEdit = (rule: MasterRule) => {
        setRuleName(rule.rule_name);
        setConditions(rule.conditions || []);
        setMatchType(rule.matchType || 'AND');
        setLedger(rule.actions.ledger);
        setRuleType(rule.rule_type || 'Expense');
        setContactId(rule.actions.contactId || "");
        setSelectedClients(rule.appliedClientIds || []);
        setEditingId(rule.id);
        setIsAdding(true);
    };

    const toggleClientSelection = (clientId: string) => {
        if (selectedClients.includes(clientId)) {
            setSelectedClients(selectedClients.filter(id => id !== clientId));
        } else {
            setSelectedClients([...selectedClients, clientId]);
        }
    };

    const toggleAllClients = () => {
        if (selectedClients.length === connectedCompanies.length) {
            setSelectedClients([]);
        } else {
            setSelectedClients(connectedCompanies.map(c => c.id));
        }
    };

    // Helper to display rule condition summary
    const getConditionSummary = (rule: MasterRule) => {
        if (!rule.conditions || rule.conditions.length === 0) return "No conditions";
        const first = rule.conditions[0];
        const count = rule.conditions.length;
        const summary = `${first.field} ${first.operator.replace('_', ' ')} "${first.value}"`;
        if (count > 1) {
            return `${summary} +${count - 1} more`;
        }
        return summary;
    };

    const ledgerOptions = getLedgerOptions();

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-col gap-2 py-4">
                <div className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center">
                        <Users className="mr-2 h-4 w-4" /> Master Rules
                    </CardTitle>
                    {!isAdding && (
                        <Button size="sm" onClick={() => setIsAdding(true)}>
                            <Plus className="h-4 w-4 mr-2" /> Create Master Rule
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4">

                {/* Add/Edit Form */}
                {isAdding && (
                    <div className="border border-white/10 rounded-md p-3 bg-white/5 space-y-3 animate-in fade-in slide-in-from-top-2 backdrop-blur-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-foreground">{editingId ? 'Edit Master Rule' : 'New Master Rule'}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={resetForm}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Rule Name</Label>
                            <Input className="h-7 text-sm bg-black/20 border-white/10 text-foreground" value={ruleName} onChange={e => setRuleName(e.target.value)} placeholder="e.g. Uber Global" />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">If</Label>
                            <RuleBuilder
                                conditions={conditions}
                                matchType={matchType}
                                onChange={(newConditions, newType) => {
                                    setConditions(newConditions);
                                    setMatchType(newType);
                                }}
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Then Apply</Label>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Transaction Type</Label>
                                    <Select value={ruleType} onValueChange={(val: TransactionType) => {
                                        setRuleType(val);
                                        setLedger(""); // Reset ledger on type change
                                        setContactId("");
                                    }}>
                                        <SelectTrigger className="h-7 text-xs bg-black/20 border-white/10 text-foreground">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TRANSACTION_TYPES.map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">
                                        {ruleType === 'Income' ? 'Customer (Optional)' :
                                            ruleType === 'Transfer' ? 'N/A' :
                                                'Vendor (Optional)'}
                                    </Label>

                                    {ruleType !== 'Transfer' && (
                                        <Select value={contactId} onValueChange={setContactId}>
                                            <SelectTrigger className="h-7 text-xs bg-black/20 border-white/10 text-foreground">
                                                <SelectValue placeholder="Select Contact" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                {(ruleType === 'Income' ? customers : vendors).map(c => (
                                                    <SelectItem key={c.Id} value={c.Id}>{c.DisplayName}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    {ruleType === 'Transfer' && (
                                        <div className="h-7 flex items-center text-xs text-muted-foreground italic px-2 border border-white/10 rounded bg-white/5">
                                            Not applicable
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">
                                    {ruleType === 'Transfer' ? 'Transferee Bank Account' :
                                        ruleType === 'Income' ? 'Income Ledger' :
                                            'Expense Ledger'}
                                </Label>
                                <Select value={ledger} onValueChange={setLedger}>
                                    <SelectTrigger className="h-7 text-xs bg-black/20 border-white/10 text-foreground">
                                        <SelectValue placeholder="Select Account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ledgerOptions.map(a => (
                                            <SelectItem key={a.Id} value={a.Name}>
                                                {a.Name} <span className="text-muted-foreground text-[10px] ml-1">({a.AccountType})</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-white/10">
                            <div className="flex items-center justify-between mb-2">
                                <Label className="text-xs font-semibold text-foreground">Apply to Clients</Label>
                                <Button variant="link" size="sm" className="h-auto p-0 text-[10px] text-primary" onClick={toggleAllClients}>
                                    {selectedClients.length === connectedCompanies.length ? 'Deselect All' : 'Select All'}
                                </Button>
                            </div>
                            <div className="bg-black/20 border border-white/10 rounded p-2 max-h-32 overflow-y-auto space-y-1">
                                {connectedCompanies.map(client => (
                                    <div key={client.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`client-${client.id}`}
                                            checked={selectedClients.includes(client.id)}
                                            onCheckedChange={() => toggleClientSelection(client.id)}
                                        />
                                        <label htmlFor={`client-${client.id}`} className="text-xs cursor-pointer text-foreground">{client.name}</label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button size="sm" className="w-full glow-primary" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-2" /> {editingId ? 'Update Master Rule' : 'Save & Push to Clients'}
                        </Button>
                    </div>
                )}

                {/* List Rules */}
                <div className="space-y-2">
                    {masterRules.map(rule => (
                        <div key={rule.id} className="group border border-white/10 rounded-md p-3 hover:bg-white/5 transition-colors bg-black/20">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium text-foreground">{rule.rule_name}</span>
                                        {rule.rule_type && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-muted-foreground border border-white/10">
                                                {rule.rule_type}
                                            </span>
                                        )}
                                        <Badge variant="secondary" className="text-[10px] h-5 bg-white/10 text-muted-foreground border-white/10">
                                            {rule.appliedClientIds.length} Clients
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        <span className={`inline-block px-1 rounded mr-1 ${rule.matchType === 'OR' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {rule.matchType}
                                        </span>
                                        {getConditionSummary(rule)}
                                    </p>

                                    <div className="flex items-center gap-2 mt-1">
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                        <p className="text-xs font-medium text-foreground">
                                            {rule.actions.ledger}
                                        </p>
                                        {rule.actions.contactId && (
                                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                                • {contacts.find(c => c.id === rule.actions.contactId)?.name || 'Contact Selected'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="hidden group-hover:flex gap-1">
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-blue-400" onClick={() => startEdit(rule)}>
                                        <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => deleteMasterRule(rule.id)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>

                            {/* Applied Clients List (Optional/Collapsed) */}
                            {rule.appliedClientIds.length > 0 && (
                                <div className="mt-2 text-[10px] text-muted-foreground flex flex-wrap gap-1">
                                    <Users className="h-3 w-3 mr-1 inline" />
                                    {rule.appliedClientIds.slice(0, 3).map(cid => connectedCompanies.find(c => c.id === cid)?.name).join(", ")}
                                    {rule.appliedClientIds.length > 3 && `, +${rule.appliedClientIds.length - 3} more`}
                                </div>
                            )}
                        </div>
                    ))}
                    {masterRules.length === 0 && !isAdding && (
                        <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 mb-2">
                                <Users className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <h3 className="mt-2 text-sm font-semibold text-foreground">No master rules</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Create global rules to apply across multiple clients.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
