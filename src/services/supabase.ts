import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// We provide a fallback to prevent the app from crashing on load if variables are missing.
// The user will still need to provide real values for functionality to work.
const placeholderUrl = 'https://placeholder-project.supabase.co';
const placeholderKey = 'placeholder-key';

export const supabase = createClient(
  supabaseUrl || placeholderUrl,
  supabaseAnonKey || placeholderKey
);

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
