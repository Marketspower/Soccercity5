"use client";

import { useEffect } from "react";
import Link from "next/link";
import { 
  LayoutDashboard, 
  LandPlot, 
  CalendarDays, 
  PartyPopper, 
  Tags, 
  Users, 
  Bell,
  TrendingUp,
  DollarSign,
  Clock
} from "lucide-react";
import { useAppStore } from "@/lib/store";

const ADMIN_NAV = [
  { href: "/admin", label: "Tableau de bord", Icon: LayoutDashboard },
  { href: "/admin/terrains", label: "Terrains", Icon: LandPlot },
  { href: "/admin/reservations", label: "Réservations", Icon: CalendarDays },
  { href: "/admin/evenements", label: "Événements", Icon: PartyPopper },
  { href: "/admin/tarifs", label: "Tarifs", Icon: Tags },
  { href: "/admin/utilisateurs", label: "Utilisateurs", Icon: Users },
  { href: "/admin/notifications", label: "Notifications", Icon: Bell },
];

export default function AdminDashboard() {
  const { 
    fields, 
    reservations, 
    events, 
    loadInitialData, 
    isInitialized,
    isLoading 
  } = useAppStore();

  useEffect(() => {
    if (!isInitialized) {
      loadInitialData();
    }
  }, [isInitialized, loadInitialData]);

  // Calcul des statistiques
  const totalFields = fields.length;
  const activeFields = fields.filter(f => f.active).length;
  const totalReservations = reservations.length;
  const confirmedReservations = reservations.filter(r => r.status === "confirmed").length;
  const pendingEvents = events.filter(e => e.status === "new").length;
  const totalRevenue = reservations
    .filter(r => r.status === "confirmed")
    .reduce((sum, r) => sum + r.price, 0);

  const stats = [
    { label: "Terrains actifs", value: activeFields, total: totalFields, Icon: LandPlot, color: "text-blue-400" },
    { label: "Réservations", value: confirmedReservations, total: totalReservations, Icon: CalendarDays, color: "text-green-400" },
    { label: "Événements en attente", value: pendingEvents, Icon: PartyPopper, color: "text-yellow-400" },
    { label: "Revenus", value: totalRevenue, prefix: "$", Icon: DollarSign, color: "text-purple-400" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 to-black">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚽</div>
          <p className="text-white/60">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-black to-blue-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
            <LayoutDashboard className="size-8 text-blue-400" />
            Tableau de bord
          </h1>
          <p className="text-blue-300/60 mt-1">
            Gérez votre complexe de soccer en temps réel
          </p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
              <div className="flex items-center justify-between mb-2">
                <stat.Icon className={`size-6 ${stat.color}`} />
                {stat.total !== undefined && (
                  <span className="text-xs text-white/40">sur {stat.total}</span>
                )}
              </div>
              <p className="text-2xl font-bold text-white">
                {stat.prefix}{stat.value.toLocaleString('fr-CA')}
              </p>
              <p className="text-sm text-white/50">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Navigation rapide */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADMIN_NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center hover:bg-white/10 hover:border-blue-500/50 transition-all group"
            >
              <Icon className="size-10 mx-auto mb-3 text-blue-400 group-hover:text-blue-300 transition-colors" />
              <span className="text-white font-medium block">{label}</span>
            </Link>
          ))}
        </div>

        {/* Activité récente */}
        <div className="mt-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="size-5 text-blue-400" />
            Activité récente
          </h2>
          {reservations.length === 0 && events.length === 0 ? (
            <p className="text-white/40 text-center py-8">
              Aucune activité récente
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...reservations, ...events]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 10)
                .map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white/70">
                        {'fieldId' in item ? (
                          <>📅 Réservation - {item.userName}</>
                        ) : (
                          <>🎉 Événement - {item.firstName} {item.lastName}</>
                        )}
                      </span>
                    </div>
                    <span className="text-xs text-white/30">
                      {new Date(item.createdAt).toLocaleDateString('fr-CA')}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Lien retour */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
            ← Retour au site
          </Link>
        </div>
      </div>
    </div>
  );
}