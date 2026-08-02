import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseClient(): SupabaseClient | null {
  return supabaseClient;
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  return supabaseAdminClient;
}

export async function verifySupabaseToken(token: string): Promise<{ valid: boolean; user?: any; error?: string }> {
  if (!supabaseClient) {
    return { valid: false, error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await supabaseClient.auth.getUser(token);
    if (error || !data.user) {
      return { valid: false, error: error?.message || 'User not found in Supabase' };
    }
    return { valid: true, user: data.user };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Supabase token validation error' };
  }
}
