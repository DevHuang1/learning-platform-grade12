import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function hasSupabaseAdmin() {
  return Boolean(supabaseUrl && serviceRoleKey);
}

export function createAdminSupabase(): SupabaseClient {
  if (!hasSupabaseAdmin()) {
    throw new Error(
      "Server-side Supabase is not configured. Add SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
