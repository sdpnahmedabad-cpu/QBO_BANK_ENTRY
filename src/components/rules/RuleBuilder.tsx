"use client";

import { useState } from "react";
import { RuleCondition, ConditionField, ConditionOperator } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface RuleBuilderProps {
    conditions: RuleCondition[];
    matchType: 'AND' | 'OR';
    onChange: (conditions: RuleCondition[], matchType: 'AND' | 'OR') => void;
}

const OPERATORS_BY_FIELD: Record<ConditionField, { label: string; value: ConditionOperator }[]> = {
    'Description': [
        { label: 'Contains', value: 'contains' },
        { label: 'Does not contain', value: 'not_contains' },
        { label: 'Starts with', value: 'starts_with' },
        { label: 'Ends with', value: 'ends_with' },
        { label: 'Equals', value: 'equals' },
    ],
    'Amount': [
        { label: 'Greater than', value: 'gt' },
        { label: 'Less than', value: 'lt' },
        { label: 'Equal to', value: 'eq' },
        { label: 'Greater than or equal', value: 'gte' },
        { label: 'Less than or equal', value: 'lte' },
        { label: 'Equals', value: 'equals' },
    ]
};

export function RuleBuilder({ conditions, matchType, onChange }: RuleBuilderProps) {

    const addCondition = () => {
        const newCondition: RuleCondition = {
            id: Math.random().toString(36).substr(2, 9),
            field: 'Description',
            operator: 'contains',
            value: ''
        };
        onChange([...conditions, newCondition], matchType);
    };

    const removeCondition = (id: string) => {
        onChange(conditions.filter(c => c.id !== id), matchType);
    };

    const updateCondition = (id: string, updates: Partial<RuleCondition>) => {
        onChange(conditions.map(c => {
            if (c.id !== id) return c;

            // Should reset operator if field changes to compatible defaults? 
            // For simplicity, if field changes, reset operator to first available
            if (updates.field && updates.field !== c.field) {
                return {
                    ...c,
                    ...updates,
                    operator: OPERATORS_BY_FIELD[updates.field as ConditionField]?.[0]?.value || 'contains'
                };
            }
            return { ...c, ...updates };
        }), matchType);
    };

    return (
        <div className="space-y-4 border rounded-md p-3 bg-slate-50">
            <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium text-slate-700">When</span>
                <Select
                    value={matchType}
                    onValueChange={(val: 'AND' | 'OR') => onChange(conditions, val)}
                >
                    <SelectTrigger className="w-[100px] h-8 bg-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="AND">ALL</SelectItem>
                        <SelectItem value="OR">ANY</SelectItem>
                    </SelectContent>
                </Select>
                <span className="text-sm font-medium text-slate-700">conditions match:</span>
            </div>

            <div className="space-y-2">
                {conditions.map((condition, index) => (
                    <div key={condition.id} className="flex items-center gap-2 group">
                        {/* Field Selector */}
                        <Select
                            value={condition.field}
                            onValueChange={(val: ConditionField) => updateCondition(condition.id, { field: val })}
                        >
                            <SelectTrigger className="w-[130px] h-8 bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Description">Description</SelectItem>
                                <SelectItem value="Amount">Amount</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Operator Selector */}
                        <Select
                            value={condition.operator}
                            onValueChange={(val: ConditionOperator) => updateCondition(condition.id, { operator: val })}
                        >
                            <SelectTrigger className="w-[160px] h-8 bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(OPERATORS_BY_FIELD[condition.field] || []).map(op => (
                                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Value Input */}
                        <Input
                            className="flex-1 h-8 bg-white"
                            value={condition.value}
                            onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                            placeholder={condition.field === 'Amount' ? '0.00' : 'Value...'}
                            type={condition.field === 'Amount' ? 'number' : 'text'}
                        />

                        {/* Delete Button */}
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeCondition(condition.id)}
                            disabled={conditions.length === 1}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>

            <Button size="sm" variant="outline" onClick={addCondition} className="w-full text-xs h-8 border-dashed">
                <Plus className="h-3 w-3 mr-1" /> Add Condition
            </Button>
        </div>
    );
}
