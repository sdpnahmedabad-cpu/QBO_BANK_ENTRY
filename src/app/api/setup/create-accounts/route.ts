import { qboClient } from "@/lib/qbo";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { companyId, accounts } = await request.json();

        if (!companyId || !accounts || !Array.isArray(accounts)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const results = [];
        const errors = [];

        // QBO doesn't have a bulk account create, so we iterate
        // Alternatively we could use Batch but let's start with simple iteration
        for (const account of accounts) {
            try {
                const data = {
                    Name: account.Name,
                    AccountType: account.AccountType,
                    DetailType: account.DetailType,
                    Description: account.Description
                };

                const res = await qboClient.createEntity(supabase, 'Account', data, companyId);
                results.push({ name: account.Name, success: true, qboId: res.Account?.Id });
            } catch (err: any) {
                console.error(`Error creating account ${account.Name}:`, err);
                errors.push({ name: account.Name, error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            createdCount: results.length,
            results,
            errors
        });

    } catch (error: any) {
        console.error('Error in account creation:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
