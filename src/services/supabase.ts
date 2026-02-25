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
    // Manual conversion instead of fetch(base64) which can fail on large strings
    const base64Parts = base64Data.split(',');
    if (base64Parts.length < 2) return base64Data;
    
    const base64Content = base64Parts[1];
    const byteCharacters = atob(base64Content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

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
