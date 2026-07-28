// app/admin/page.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { AdminGallery } from "@/components/admin/AdminGallery";
import { AdminMedia } from "@/components/admin/AdminMedia";

export default function AdminDashboard() {
  const { loadInitialData, isInitialized, isLoading } = useAppStore();

  useEffect(() => {
    if (!isInitialized) {
      loadInitialData();
    }
  }, [isInitialized, loadInitialData]);

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
    <div className="space-y-12">
      {/* Galerie */}
      <AdminGallery />

      {/* Médias */}
      <AdminMedia />

      {/* Statistiques rapides */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Statistiques</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">{useAppStore.getState().fields.length}</p>
            <p className="text-sm text-white/40">Terrains</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">{useAppStore.getState().gallery.length}</p>
            <p className="text-sm text-white/40">Images</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">{useAppStore.getState().media.length}</p>
            <p className="text-sm text-white/40">Médias</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">{useAppStore.getState().events.length}</p>
            <p className="text-sm text-white/40">Événements</p>
          </div>
        </div>
      </div>
    </div>
  );
}