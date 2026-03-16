'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getProfile() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }

    return data;
}

export async function updateFirmDetails(firmName: string, adminEmail: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('profiles')
        .update({
            firm_name: firmName,
            admin_email_display: adminEmail
        })
        .eq('id', user.id);

    if (error) {
        console.error('Error updating firm details:', error);
        throw new Error(error.message);
    }

    revalidatePath('/settings');
    return { success: true };
}
