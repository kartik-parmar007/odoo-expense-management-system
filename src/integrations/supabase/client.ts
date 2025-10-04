// Supabase client configuration for the application
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://yhlsajwbjxvqfpkwxlzh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlobHNhandianh2cWZwa3d4bHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NDAzOTcsImV4cCI6MjA3NTExNjM5N30.-xywtyN-BN9H7DV2y4sEodI9zslXcEUz_I58gwBVYMM";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});