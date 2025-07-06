
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types_db'; // Assuming you might create this later for typed Supabase access

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.includes('YOUR_SUPABASE_URL') || !supabaseAnonKey || supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')) {
  const missing = [];
  if (!supabaseUrl || supabaseUrl.includes('YOUR_SUPABASE_URL')) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseAnonKey || supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  throw new Error(
    `CRITICAL ERROR: Supabase configuration is missing or incorrect. ` +
    `Please check your project's .env file and ensure the following variables are set correctly: ${missing.join(', ')}. ` +
    `You can find these values in your Supabase project's API settings. After updating the .env file, you MUST restart the development server.`
  );
}

// If you have generated types for your Supabase database, you can use them here
// For now, we'll use the generic client
// export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
