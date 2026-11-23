import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl &&
    !supabaseUrl.includes('your-project') &&
    (secretKey || publishableKey)
  );
};

// Admin client with elevated privileges for server-side operations
export const supabase = isSupabaseConfigured() && secretKey
  ? createClient(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : isSupabaseConfigured() && publishableKey
  ? createClient(supabaseUrl, publishableKey)
  : null;

// Public client for operations on behalf of public / anon context
export const supabasePublic = isSupabaseConfigured() && publishableKey
  ? createClient(supabaseUrl, publishableKey)
  : null;
