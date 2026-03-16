"use server";

import { createClient } from "@/utils/supabase/server";

export async function getApiKeys(companyId: string) {
    const supabase = await createClient();
    const { data: userAuth } = await supabase.auth.getUser();

    if (!userAuth?.user) return [];

    const { data, error } = await supabase
        .from("api_keys")
        .select("id, name, token, created_at, last_used_at, is_active")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching API keys:", error);
        return [];
    }

    return data || [];
}

export async function generateApiKey(companyId: string, name: string) {
    const supabase = await createClient();
    const { data: userAuth } = await supabase.auth.getUser();

    if (!userAuth?.user) throw new Error("Unauthorized");

    // Generate a secure random token (e.g., finza_live_xxxxx)
    const randomString = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '')
        : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const token = `finza_live_${randomString}`;

    const { data, error } = await supabase
        .from("api_keys")
        .insert({
            company_id: companyId,
            name: name,
            token: token,
            created_by: userAuth.user.id
        })
        .select()
        .single();

    if (error) {
        console.error("Error generating API key:", error);
        throw new Error(error.message);
    }

    return data;
}

export async function revokeApiKey(id: string) {
    const supabase = await createClient();
    const { data: userAuth } = await supabase.auth.getUser();

    if (!userAuth?.user) throw new Error("Unauthorized");

    const { error } = await supabase
        .from("api_keys")
        .update({ is_active: false })
        .eq("id", id);

    if (error) {
        console.error("Error revoking API key:", error);
        throw new Error(error.message);
    }

    return true;
}
