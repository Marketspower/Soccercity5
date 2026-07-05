"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

// Configuration du QueryClient pour React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 secondes avant de considérer les données comme périmées
      refetchOnWindowFocus: false, // Ne pas recharger quand la fenêtre reprend le focus
      retry: 1, // Une seule tentative en cas d'échec
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const { loadInitialData, isInitialized, isLoading: storeLoading } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

  // Charger les données initiales
  useEffect(() => {
    const init = async () => {
      try {
        if (!isInitialized) {
          await loadInitialData();
        }
      } catch (error) {
        console.error('Erreur lors du chargement initial:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [isInitialized, loadInitialData]);

  // Si le chargement est en cours, afficher un écran de chargement
  if (isLoading || storeLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-950 via-black to-blue-950">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-pulse">⚽</div>
          <div className="h-2 w-48 bg-blue-600/20 rounded-full mx-auto overflow-hidden">
            <div className="h-full w-1/2 bg-blue-500 rounded-full animate-[slide_1s_ease-in-out_infinite]" />
          </div>
          <p className="mt-4 text-blue-300/60 text-sm font-medium">
            Chargement du complexe...
          </p>
          <p className="mt-1 text-blue-300/30 text-xs">
            Soccer City - Le jeu s'accélère ici
          </p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider 
        attribute="class" 
        defaultTheme="dark" 
        enableSystem={false}
        storageKey="soccer-city-theme"
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// Hook personnalisé pour utiliser le provider avec le store
export function useProviders() {
  const { isInitialized, isLoading } = useAppStore();
  return { isInitialized, isLoading };
}