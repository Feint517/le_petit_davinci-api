import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Initialize Supabase client
 */
const initSupabase = (): SupabaseClient => {
    try {
        const supabaseUrl: string = process.env.SUPABASE_URL as string;
        const supabaseKey: string = process.env.SUPABASE_ANON_KEY as string;
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase URL or API key not provided in environment variables');
        }

        const client = createClient(supabaseUrl, supabaseKey);
        console.log('✅ Supabase client initialized');
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

