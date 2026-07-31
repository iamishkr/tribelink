import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jrkmxzjghmnzcgvlntpf.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_4L9iOfnpH67PgZ3co6iCZw_0LSqhq8e';

export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey);

export default supabaseAdmin;
