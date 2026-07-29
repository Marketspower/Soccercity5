// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Valeurs par défaut pour éviter les erreurs de build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Vérification des variables d'environnement
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Variables Supabase manquantes. Utilisation de valeurs par défaut.');
}

// Fonction pour vérifier si Supabase est configuré
export const isSupabaseConfigured = () => {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// Fonction pour vérifier la connexion
export const checkSupabaseConnection = async () => {
  try {
    if (!isSupabaseConfigured()) {
      console.warn('⚠️ Supabase non configuré');
      return false;
    }
    const { data, error } = await supabase.from('fields').select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log('✅ Connexion Supabase établie');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion Supabase:', error);
    return false;
  }
};

// Fonction pour obtenir l'utilisateur actuel
export const getCurrentUser = async () => {
  try {
    if (!isSupabaseConfigured()) {
      return null;
    }
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('❌ Erreur récupération utilisateur:', error);
    return null;
  }
};

// Fonction pour vérifier si l'utilisateur est admin
export const isUserAdmin = async () => {
  try {
    if (!isSupabaseConfigured()) {
      return false;
    }
    const user = await getCurrentUser();
    if (!user) return false;
    
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (error) throw error;
    return data?.role === 'admin';
  } catch (error) {
    console.error('❌ Erreur vérification admin:', error);
    return false;
  }
};

// Fonction pour se déconnecter
export const signOut = async () => {
  try {
    if (!isSupabaseConfigured()) {
      return false;
    }
    await supabase.auth.signOut();
    return true;
  } catch (error) {
    console.error('❌ Erreur déconnexion:', error);
    return false;
  }
};
