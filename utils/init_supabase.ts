import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Initialize Supabase client
 */
const initSupabase = (): SupabaseClient => {
    try {
        const supabaseUrl: string = process.env.SUPABASE_URL as string;
        // Use service role key for backend operations (bypasses RLS)
        const supabaseKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase URL or Service Role key not provided in environment variables');
        }

        const client = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        console.log('✅ Supabase client initialized with service role');
        return client;
    } catch (err: any) {
        console.log('❌ Supabase initialization error:', err.message);
        process.exit(1);
    }
};

// Create and export the Supabase client instance
const supabase = initSupabase();

export default supabase;
export { initSupabase };

