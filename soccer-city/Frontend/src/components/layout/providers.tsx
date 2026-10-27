"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

/**
 * Le contenu s'affiche IMMÉDIATEMENT (rendu serveur lisible par Google).
 * Les données (terrains, galerie, médias…) se chargent en arrière-plan ;
 * chaque section gère son propre état vide.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
            refetchOnMount: true,
            refetchOnReconnect: true,
          },
          mutations: { retry: 1 },
        },
      })
  );
  const loadInitialData = useAppStore((s) => s.loadInitialData);
  const loadUser = useAppStore((s) => s.loadUser);

  useEffect(() => {
    loadInitialData();
    // Connexion / déconnexion : recharge (ou efface) les données privées admin.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") loadUser();
    });
    return () => subscription.unsubscribe();
  }, [loadInitialData, loadUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="soccer-city-theme">
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// Hook conservé pour compatibilité
export function useProviders() {
  const { isInitialized, isLoading } = useAppStore();
  return { isInitialized, isLoading };
}
