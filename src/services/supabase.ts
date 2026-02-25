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

export const uploadImage = async (base64Data: string, fileName: string) => {
  if (!isSupabaseConfigured) return base64Data;
  
  try {
    // Convert base64 to blob
    const res = await fetch(base64Data);
    const blob = await res.blob();

    const { data, error } = await supabase.storage
      .from('illustrations')
      .upload(`${Date.now()}-${fileName}.png`, blob, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('illustrations')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error("Upload error:", error);
    return base64Data; // Fallback to base64 if upload fails
  }
};
