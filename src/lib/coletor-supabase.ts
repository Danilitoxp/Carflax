import { createClient } from '@supabase/supabase-js';

// Credenciais do projeto Coletor (htcyaamvyjghjkzrzhvk)
const supabaseUrl = 'https://htcyaamvyjghjkzrzhvk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Y3lhYW12eWpnaGprenJ6aHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTQ2MDEsImV4cCI6MjA4OTMzMDYwMX0.JiM9lmaCYJx4-PmNS88McmvWr3nQZfv5S9CYZjF-BGc';

export const coletorSupabase = createClient(supabaseUrl, supabaseAnonKey);
