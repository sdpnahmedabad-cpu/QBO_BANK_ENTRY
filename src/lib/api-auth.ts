import { createClient } from "@/utils/supabase/server";

/**
 * Verifies an incoming request's API key.
 * Expected header: x-api-key: finza_live_xxxx
 * 
 * Returns the company_id if valid, otherwise throws an error.
 */
export async function verifyApiKey(request: Request): Promise<string> {
    const apiKey = request.headers.get("x-api-key") ||
        request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!apiKey) {
        throw new Error("Missing API Key. Please provide x-api-key header.");
    }

    const supabase = await createClient();

    // Check if key exists and is active
    const { data, error } = await supabase
        .from("api_keys")
        .select("company_id, is_active")
        .eq("token", apiKey)
        .single();

    if (error || !data) {
        throw new Error("Invalid API Key.");
    }

    if (!data.is_active) {
        throw new Error("API Key has been revoked.");
    }

    // Update last used timestamp (fire and forget)
    supabase
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("token", apiKey)
        .then(({ error }: { error: any }) => {
            if (error) console.error("Failed to update API key last_used_at:", error);
        });

    return data.company_id;
}
