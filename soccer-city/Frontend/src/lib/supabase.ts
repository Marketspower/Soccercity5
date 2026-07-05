import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// On vérifie si les clés existent, sinon on passe des valeurs de secours sûres pour le build
const validUrl = supabaseUrl && supabaseUrl !== '' ? supabaseUrl : 'https://placeholder-project.supabase.co';
const validKey = supabaseAnonKey && supabaseAnonKey !== '' ? supabaseAnonKey : 'placeholder-key';

export const supabase = createClient(validUrl, validKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});