"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell, CalendarDays, LandPlot, LayoutDashboard, PartyPopper, Tags, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const NAV = [
  { href: "/admin", label: "Tableau de bord", Icon: LayoutDashboard },
  { href: "/admin/terrains", label: "Terrains", Icon: LandPlot },
  { href: "/admin/reservations", label: "Réservations", Icon: CalendarDays },
  { href: "/admin/evenements", label: "Événements", Icon: PartyPopper },
  { href: "/admin/tarifs", label: "Tarifs", Icon: Tags },
  { href: "/admin/utilisateurs", label: "Utilisateurs", Icon: Users },
  { href: "/admin/notifications", label: "Notifications", Icon: Bell },
];

/**
 * Espace d'administration.
 * ⚠ Démo : accès libre. En production, protéger ce segment par
 * l'authentification Supabase (middleware + RLS, rôle `admin`).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Garde d'hydratation : le store persisté (localStorage) n'existe qu'au client
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="container grid min-h-screen gap-8 pt-24 pb-16 md:pt-28 lg:grid-cols-[240px_1fr]">
      {/* ── Sidebar ── */}
      <aside className="h-fit rounded-lg border bg-card p-4 lg:sticky lg:top-24">
        <div className="mb-4 flex items-center gap-2 border-b px-2 pb-4">
          <Image src="/brand/emblem.png" alt="" width={34} height={26} className="h-6 w-auto" />
          <div>
            <p className="font-display text-sm font-bold uppercase italic">Administration</p>
            <p className="text-[10px] text-muted-foreground">Soccer City</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Navigation administration">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-white shadow-glow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="size-4" /> {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ── Contenu ── */}
      <div className="min-w-0">{mounted ? children : <Skeleton className="h-96 rounded-lg" />}</div>
    </div>
  );
}
