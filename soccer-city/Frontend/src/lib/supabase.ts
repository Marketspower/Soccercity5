// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Valeurs par défaut pour le build (évite les erreurs)
const DEFAULT_SUPABASE_URL = 'https://placeholder.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'placeholder-key';

// Récupérer les variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

// Vérifier si Supabase est configuré pour de vrai
export const isSupabaseConfigured = () => {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && 
           process.env.NEXT_PUBLIC_SUPABASE_URL !== DEFAULT_SUPABASE_URL &&
           process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && 
           process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== DEFAULT_SUPABASE_ANON_KEY);
};

// ✅ Obtenir les headers d'authentification
export const getSupabaseHeaders = () => {
  return {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  };
};

// Logger l'état au démarrage (uniquement côté client)
if (typeof window !== 'undefined') {
  console.log('🔧 Supabase configuré:', isSupabaseConfigured());
  if (isSupabaseConfigured()) {
    console.log('✅ Connexion à Supabase:', supabaseUrl);
  } else {
    console.warn('⚠️ Supabase non configuré - Mode dégradé');
  }
}

// Créer le client Supabase avec les headers d'authentification
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
  },
});

// Fonction pour vérifier la connexion
export const checkSupabaseConnection = async () => {
  if (!isSupabaseConfigured()) {
    console.warn('⚠️ Supabase non configuré');
    return false;
  }
  
  try {
    const { data, error } = await supabase
      .from('fields')
      .select('count', { count: 'exact', head: true });
    
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
  if (!isSupabaseConfigured()) {
    return null;
  }
  
  try {
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
  if (!isSupabaseConfigured()) {
    return false;
  }
  
  try {
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
  if (!isSupabaseConfigured()) {
    return false;
  }
  
  try {
    await supabase.auth.signOut();
    return true;
  } catch (error) {
    console.error('❌ Erreur déconnexion:', error);
    return false;
  }
};

// Fonction utilitaire pour les requêtes avec fallback
export const safeSupabaseQuery = async <T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  fallbackData: T
): Promise<T> => {
  if (!isSupabaseConfigured()) {
    console.warn('⚠️ Supabase non configuré - Utilisation des données de fallback');
    return fallbackData;
  }
  
  try {
    const { data, error } = await queryFn();
    if (error) throw error;
    return data || fallbackData;
  } catch (error) {
    console.error('❌ Erreur requête Supabase:', error);
    return fallbackData;
  }
};

// ✅ Fonction pour faire des requêtes avec fetch direct (solution de contournement)
export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${supabaseUrl}/rest/v1/${endpoint}`;
  const headers = {
    ...getSupabaseHeaders(),
    ...options.headers,
  };
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
};
