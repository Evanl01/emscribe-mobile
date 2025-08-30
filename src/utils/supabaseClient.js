import { createClient } from '@supabase/supabase-js';
import ENV from './environment';

// Read from Expo environment variables
const supabaseUrl = ENV.SUPABASE_URL;
const supabaseAnonKey = ENV.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Environment variables missing:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey,
  });
  throw new Error('Missing Supabase environment variables. Check your .env.local file and app.config.js');
}

console.log('[Supabase] Initializing client with URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
