import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    const { error } = await adminClient
        .from('profiles')
        .upsert({
            id: user.id,
            email: user.email,
            role: 'admin'
        });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `User ${user.email} promoted to admin. Please refresh the page.` });
}
