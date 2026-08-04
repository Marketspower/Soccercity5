// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Valeurs par défaut pour éviter les erreurs
const DEFAULT_URL = 'https://placeholder.supabase.co';
const DEFAULT_KEY = 'placeholder-key';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY;

// Vérification des variables d'environnement
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Variables Supabase manquantes. Vérifiez votre fichier .env.local');
}

// Vérifier si Supabase est configuré
export const isSupabaseConfigured = () => {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && 
           process.env.NEXT_PUBLIC_SUPABASE_URL !== DEFAULT_URL &&
           process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && 
           process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== DEFAULT_KEY);
};

// Obtenir les headers d'authentification (utilisé uniquement pour des appels fetch manuels, pas par le client `supabase`)
export const getSupabaseHeaders = () => {
  return {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  };
};

// Logger l'état (uniquement côté client)
if (typeof window !== 'undefined') {
  console.log('🔧 Supabase configuré:', isSupabaseConfigured());
  if (isSupabaseConfigured()) {
    console.log('✅ Connexion à Supabase:', supabaseUrl);
  } else {
    console.warn('⚠️ Supabase non configuré - Mode dégradé');
  }
}

// ✅ Pas de `global.headers` codés en dur ici : le SDK gère automatiquement
// l'apikey et le token de session courant (anonyme ou connecté) sur chaque
// requête. Fixer ces headers manuellement écraserait le token de
// l'utilisateur connecté et provoquerait des 403 RLS sur les opérations
// protégées (upload, update, etc.).
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
});

// Fonction pour vérifier la connexion
export const checkSupabaseConnection = async () => {
  if (!isSupabaseConfigured()) {
    console.warn('⚠️ Supabase non configuré');
    return false;
  }
  
  try {
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
  if (!isSupabaseConfigured()) {
    return null;
  }
  
  try {
    // ✅ CORRIGÉ : on vérifie d'abord qu'une session existe. getSession()
    // ne lève jamais d'exception, contrairement à getUser() qui lève
    // AuthSessionMissingError pour un visiteur non connecté. Ça évite un
    // faux "❌ Erreur" en console pour tout visiteur public du site.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

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

// Fonction pour faire des requêtes avec fetch direct (indépendante du client `supabase`, n'est pas affectée par la session utilisateur)
export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase non configuré');
  }
  
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
