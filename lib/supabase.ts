export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
};
export const isSupabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey);
// Production adapter seam: connect @supabase/ssr here and replace demo repositories.
