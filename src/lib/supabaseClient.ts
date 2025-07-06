import { createClient } from '@supabase/supabase-js';
import type { Database } from './types_db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Enhanced check for placeholder values to provide a clearer error.
if (!supabaseUrl || supabaseUrl.includes('YOUR_SUPABASE_URL') || !supabaseAnonKey || supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')) {
  const missing = [];
  if (!supabaseUrl || supabaseUrl.includes('YOUR_SUPABASE_URL')) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseAnonKey || supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  // This error is thrown to stop the application from running with invalid configuration.
  // It is a critical error that must be resolved by the user.
  throw new Error(
    `CRITICAL ERROR: Supabase configuration is missing or incorrect. ` +
    `Please check your project's .env file and ensure the following variables are set correctly: ${missing.join(', ')}. ` +
    `You can find these values in your Supabase project's API settings. After updating the .env file, you MUST restart the development server.`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
