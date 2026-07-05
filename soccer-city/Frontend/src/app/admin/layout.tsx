"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell, CalendarDays, LandPlot, LayoutDashboard, PartyPopper, Tags, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Tableau de bord", Icon: LayoutDashboard },
  { href: "/admin/terrains", label: "Terrains", Icon: LandPlot },
  { href: "/admin/reservations", label: "Réservations", Icon: CalendarDays },
  { href: "/admin/evenements", label: "Événements", Icon: PartyPopper },
  { href: "/admin/tarifs", label: "Tarifs", Icon: Tags },
  { href: "/admin/utilisateurs", label: "Utilisateurs", Icon: Users },
  { href: "/admin/notifications", label: "Notifications", Icon: Bell },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-black to-blue-950 pt-4">
      <div className="container mx-auto px-4">
        {/* En-tête admin simplifié - SANS LOGO POUR ÉVITER LE DOUBLE AFFICHAGE */}
        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="size-5 text-blue-400" />
            <span className="text-white/60 text-sm font-medium">Administration</span>
          </div>
          <Link href="/" className="text-white/40 hover:text-white/60 text-xs transition-colors">
            ← Retour au site
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
          {/* Sidebar */}
          <aside className="h-fit rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-3 lg:sticky lg:top-6">
            <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Navigation administration">
              {NAV.map(({ href, label, Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all",
                      active
                        ? "bg-blue-600 text-white shadow-glow-sm"
                        : "text-white/50 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="hidden lg:inline">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Contenu */}
          <div className="min-w-0">
            {mounted ? children : (
              <div className="flex items-center justify-center h-96">
                <div className="text-white/40">Chargement...</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}