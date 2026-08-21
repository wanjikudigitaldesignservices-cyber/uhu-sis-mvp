import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing');
}

// Service role client bypasses RLS, used only in backend
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
