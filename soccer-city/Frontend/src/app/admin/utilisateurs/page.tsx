"use client";

import { useMemo } from "react";
import { FileSpreadsheet, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { formatCAD } from "@/lib/utils";

export default function AdminUsers() {
  const { reservations } = useAppStore();

  const clients = useMemo(() => {
    const map = new Map<string, { 
      name: string; 
      email: string; 
      phone: string; 
      count: number; 
      total: number 
    }>();
    
    for (const r of reservations) {
      const prev = map.get(r.userEmail);
      if (prev) {
        prev.count += 1;
        prev.total += r.status !== "cancelled" ? r.price : 0;
      } else {
        map.set(r.userEmail, {
          name: r.userName,
          email: r.userEmail,
          phone: r.userPhone,
          count: 1,
          total: r.status !== "cancelled" ? r.price : 0,
        });
      }
    }
    
    // Correction : utiliser Array.from() au lieu de spread operator
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [reservations]);

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Utilisateurs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {clients.length + 1} compte(s)
          </p>
        </div>
      </header>

      <ul className="space-y-3">
        <li className="flex items-center justify-between rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Administration Soccer City</p>
              <p className="text-xs text-muted-foreground">admin@soccercity.ca</p>
            </div>
          </div>
          <Badge>Admin</Badge>
        </li>

        {clients.length === 0 ? (
          <li className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            Aucun client pour l&apos;instant.
          </li>
        ) : (
          clients.map((c) => (
            <li key={c.email} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <User className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.email} · {c.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">{c.count} réservation(s)</span>
                <span className="font-bold italic">{formatCAD(c.total)}</span>
                <Badge variant="secondary">Client</Badge>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}