import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = await createClient();

        const { data: industries, error: indError } = await supabase
            .from('industry_templates')
            .select(`
                id,
                name,
                industry_coa_templates (*)
            `);

        if (indError) throw indError;

        return NextResponse.json(industries);
    } catch (error: any) {
        console.error('Error fetching industries:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { name, cloneFromId, companyId } = await request.json();

        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

        // If cloning from a company (QuickBooks)
        if (companyId) {
            const { data: accounts, error: qboError } = await fetch(`${request.url.split('/api/')[0]}/api/qbo/accounts?companyId=${companyId}`).then(res => res.json().then(data => ({ data, error: !res.ok })));

            if (qboError) return NextResponse.json({ error: "Failed to fetch accounts from QBO" }, { status: 500 });

            // Create Industry
            const { data: industry, error: indError } = await supabase
                .from('industry_templates')
                .insert({ name })
                .select()
                .single();

            if (indError) throw indError;

            // Save accounts
            const coaData = accounts.map((acc: any) => ({
                industry_id: industry.id,
                account_name: acc.Name,
                account_type: acc.AccountType,
                detail_type: acc.DetailType,
                description: acc.Description || ""
            }));

            const { error: coaError } = await supabase
                .from('industry_coa_templates')
                .insert(coaData);

            if (coaError) throw coaError;

            return NextResponse.json(industry);
        }

        // Just create empty industry
        const { data: industry, error } = await supabase
            .from('industry_templates')
            .insert({ name })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(industry);

    } catch (error: any) {
        console.error('Error creating industry:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const { id } = await request.json();

        if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

        const { error } = await supabase
            .from('industry_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
