
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Use the correct Supabase configuration
const supabaseUrl = "https://bpjinatcgdmxqetfxjji.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwamluYXRjZ2RteHFldGZ4amppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5NDU1NTgsImV4cCI6MjA1MTUyMTU1OH0.79yLPqxNagQqouMrbfCyfLeaEeg3TesEqQsrR9H_ZvQ";

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function handleSupabaseResponse<T>(
  query: Promise<{ data: T | null; error: any; }>
): Promise<T> {
  const { data, error } = await query;
  
  if (error) {
    console.error('Supabase error:', error);
    throw error;
  }
  
  if (data === null) {
    throw new Error('No data returned from Supabase');
  }
  
  return data;
}
