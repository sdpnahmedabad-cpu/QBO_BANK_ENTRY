import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';


export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { id } = await params;
    try {
        const body = await request.json();
        const { rule_name, matchType, conditions, rule_type, actions, is_active } = body;

        const updates: any = {};
        if (rule_name !== undefined) updates.rule_name = rule_name;
        if (matchType !== undefined) updates.match_type = matchType;
        if (conditions !== undefined) updates.conditions = conditions;
        if (rule_type !== undefined) updates.rule_type = rule_type;
        if (actions !== undefined) updates.actions = actions;
        if (is_active !== undefined) updates.is_active = is_active;

        const { data, error } = await supabase
            .from('import_rules')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const updatedRule = {
            id: data.id,
            client_id: data.client_id,
            rule_name: data.rule_name,
            matchType: data.match_type,
            conditions: data.conditions,
            rule_type: data.rule_type,
            actions: data.actions,
            is_active: data.is_active
        };

        return NextResponse.json(updatedRule);
    } catch (e) {
        console.error('Rules PUT error:', e);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { id } = await params;

    // Use soft delete by setting is_active to false
    const { error } = await supabase
        .from('import_rules')
        .update({ is_active: false })
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
