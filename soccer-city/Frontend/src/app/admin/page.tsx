"use client";

import { useEffect } from "react";
import Link from "next/link";
import { 
  LandPlot, 
  CalendarDays, 
  PartyPopper, 
  DollarSign,
  Clock
} from "lucide-react";
import { useAppStore } from "@/lib/store";

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
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚽</div>
          <p className="text-white/40">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between mb-2">
              <stat.Icon className={`size-5 ${stat.color}`} />
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

      {/* Activité récente */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="size-4 text-blue-400" />
          Activité récente
        </h2>
        {reservations.length === 0 && events.length === 0 ? (
          <p className="text-white/40 text-center py-6 text-sm">
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
    </div>
  );
}