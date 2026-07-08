"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loadUser, isAdmin, isLoading } = useAppStore();
  const [isChecking, setIsChecking] = useState(true);

  // Si on est sur la page de login, on affiche juste le contenu
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  useEffect(() => {
    const checkAccess = async () => {
      await loadUser();
      setIsChecking(false);
      
      // Rediriger vers la page de login si l'utilisateur n'est pas admin
      if (!isAdmin) {
        router.push('/admin/login');
      }
    };
    
    checkAccess();
  }, []);

  // Écouter les changements d'authentification
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 to-black">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚽</div>
          <p className="text-white/60">Vérification des droits...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-black to-blue-950">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-xl">⚽ Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/50 text-sm">👑 Admin</span>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/');
              }}
              className="text-white/40 hover:text-white/60 text-xs transition-colors"
            >
              Déconnexion
            </button>
            <Link href="/" className="text-white/40 hover:text-white/60 text-xs transition-colors">
              ← Retour au site
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
          <aside className="h-fit rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-3">
            <nav className="flex flex-col gap-1">
              <Link href="/admin" className="text-white/70 hover:bg-white/10 rounded-md px-3 py-2 text-sm transition-colors">
                📊 Tableau de bord
              </Link>
              <Link href="/admin/terrains" className="text-white/70 hover:bg-white/10 rounded-md px-3 py-2 text-sm transition-colors">
                🏟️ Terrains
              </Link>
              <Link href="/admin/reservations" className="text-white/70 hover:bg-white/10 rounded-md px-3 py-2 text-sm transition-colors">
                📅 Réservations
              </Link>
              <Link href="/admin/evenements" className="text-white/70 hover:bg-white/10 rounded-md px-3 py-2 text-sm transition-colors">
                🎉 Événements
              </Link>
              <Link href="/admin/tarifs" className="text-white/70 hover:bg-white/10 rounded-md px-3 py-2 text-sm transition-colors">
                💰 Tarifs
              </Link>
              <Link href="/admin/statistiques" className="text-white/70 hover:bg-white/10 rounded-md px-3 py-2 text-sm transition-colors">
                📊 Statistiques
              </Link>
              <Link href="/admin/pages" className="text-white/70 hover:bg-white/10 rounded-md px-3 py-2 text-sm transition-colors">
                📄 Pages CMS
              </Link>
            </nav>
          </aside>

          <div className="min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}