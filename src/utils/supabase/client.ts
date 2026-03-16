import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        if (typeof window === 'undefined') {
            console.warn('Supabase credentials missing during build. Returning dummy client.')
        } else {
            console.error('Supabase credentials (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing in the browser environment!')
        }

        // Return a dummy object to prevent "Cannot read properties of null (reading 'auth')"
        return {
            auth: {
                getUser: async () => ({ data: { user: null }, error: null }),
                signInWithPassword: async () => ({ error: new Error('Supabase configuration is missing in environment variables.') }),
                signUp: async () => ({ error: new Error('Supabase configuration is missing in environment variables.') }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            },
            from: () => ({
                select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }), single: () => Promise.resolve({ data: null, error: null }) }) }),
            })
        } as any
    }

    return createBrowserClient(
        supabaseUrl,
        supabaseAnonKey
    )
}
