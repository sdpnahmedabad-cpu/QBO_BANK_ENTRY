import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';



export async function GET(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
        return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Use correct table and column
    const { data, error } = await supabase
        .from('import_rules')
        .select('*')
        .eq('client_id', companyId);

    if (error) {
        console.error('Rules GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map database columns to frontend format
    const rules = (data || []).map((rule: any) => ({
        id: rule.id,
        client_id: rule.client_id,
        rule_name: rule.rule_name,
        matchType: rule.match_type || 'AND',
        conditions: (rule.conditions || []).map((c: any) => ({
            ...c,
            field: c.field === 'description' ? 'Description' : (c.field === 'amount' ? 'Amount' : c.field)
        })),
        rule_type: rule.rule_type || 'Expense',
        actions: rule.actions || {},
        is_active: rule.is_active
    }));

    return NextResponse.json(rules);
}

export async function POST(request: Request) {
    const supabase = await createClient();
    try {
        const body = await request.json();
        const { client_id, rule_name, matchType, conditions, rule_type, actions } = body;

        const { data, error } = await supabase
            .from('import_rules')
            .insert([
                {
                    client_id: client_id,
                    rule_name: rule_name,
                    match_type: matchType || 'AND',
                    conditions: conditions || [],
                    rule_type: rule_type || 'Expense',
                    actions: actions || {},
                    is_active: true
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Rules POST error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const newRule = {
            id: data.id,
            client_id: data.client_id,
            rule_name: data.rule_name,
            matchType: data.match_type,
            conditions: data.conditions,
            rule_type: data.rule_type,
            actions: data.actions,
            is_active: data.is_active
        };

        return NextResponse.json(newRule);
    } catch (e: any) {
        console.error('Rules POST error:', e);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
