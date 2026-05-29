import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jvomwclogefcjpdbmxyb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2b213Y2xvZ2VmY2pwZGJteHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzA4NzMsImV4cCI6MjA5NTY0Njg3M30.79QBK69fGroGvMnSr_Vd9TStEfT_LbE8jPomzQ5pgqk';

// Fallback gracefully if keys are missing in local dev or initial startup
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

export const hasValidSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
