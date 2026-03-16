'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addCoworker(email: string, password: string) {
    const supabase = await createClient();

    // 1. Verify current user is an Admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Not authenticated');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

    if (profile?.role !== 'admin') {
        throw new Error('Unauthorized: Only admins can add users');
    }

    // 2. Create user via Admin Client (Service Role)
    const adminClient = createAdminClient();

    const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm for coworkers
        user_metadata: { role: 'coworker' }
    });

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath('/settings/users');
    return { success: true, user: data.user };
}

export async function deleteUser(userId: string) {
    const supabase = await createClient();

    // 1. Verify current user is an Admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Not authenticated');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

    if (profile?.role !== 'admin') {
        throw new Error('Unauthorized: Only admins can delete users');
    }

    if (currentUser.id === userId) {
        throw new Error('Cannot delete yourself');
    }

    // 2. Delete via Admin Client
    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath('/settings/users');
    return { success: true };
}
