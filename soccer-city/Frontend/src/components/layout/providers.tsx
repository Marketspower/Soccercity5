"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const { loadInitialData, isInitialized } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isInitialized) {
      loadInitialData().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [isInitialized, loadInitialData]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚽</div>
          <p className="text-white/60">Chargement de Soccer City...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}