import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only. Never import this file from a Client Component.
// Uses the service role key, which bypasses Row Level Security entirely.
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it in Railway's Variables tab."
    );
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
