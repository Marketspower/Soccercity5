// app/admin/comptabilite/page.tsx
// 📊 Comptabilité — revenus encaissés par période (semaine / mois / année /
// personnalisé), ventilés par source (Stripe en ligne, terminal, comptant),
// taxes collectées, soldes en attente, et export CSV pour le comptable.
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCAD } from "@/lib/utils";

type Period = "week" | "month" | "year" | "custom";

const iso = (d: Date) => d.toISOString().slice(0, 10);

function periodRange(p: Period, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date();
  if (p === "week") {
    // Semaine lundi → dimanche
    const day = (now.getDay() + 6) % 7;
    const monday = new Date(now); monday.setDate(now.getDate() - day);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    return { from: iso(monday), to: iso(sunday) };
  }
  if (p === "month") {
    return {
      from: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }
  if (p === "year") {
    return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
  }
  return { from: customFrom || iso(now), to: customTo || iso(now) };
}

type ReservationRow = {
  id: string; date: string; type: string | null; status: string;
  price: number | null; tax_gst: number | null; tax_qst: number | null;
  total: number | null; amount_paid: number | null; balance_due: number | null;
  balance_amount: number | null; balance_method: string | null; balance_paid_at: string | null;
  user_name: string;
};
type PaymentRow = { amount: number | null; method: string | null; created_at: string };
type AcademyRow = { total: number | null; amount_paid: number | null; status: string; created_at: string };

export default function ComptabilitePage() {
  const [period, setPeriod] = useState<Period>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [balancesCollected, setBalancesCollected] = useState<ReservationRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [academy, setAcademy] = useState<AcademyRow[]>([]);

  const { from, to } = useMemo(
    () => periodRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [r1, r2, r3, r4] = await Promise.all([
        // Réservations JOUÉES dans la période (par date de match)
        supabase
          .from("reservations")
          .select("id,date,type,status,price,tax_gst,tax_qst,total,amount_paid,balance_due,balance_amount,balance_method,balance_paid_at,user_name")
          .neq("status", "cancelled")
          .gte("date", from)
          .lte("date", to),
        // Soldes ENCAISSÉS à l'accueil dans la période (par date d'encaissement)
        supabase
          .from("reservations")
          .select("id,date,type,status,price,tax_gst,tax_qst,total,amount_paid,balance_due,balance_amount,balance_method,balance_paid_at,user_name")
          .gte("balance_paid_at", `${from}T00:00:00`)
          .lte("balance_paid_at", `${to}T23:59:59`),
        // Paiements Stripe reçus dans la période
        supabase
          .from("payments")
          .select("amount,method,created_at")
          .eq("status", "paid")
          .gte("created_at", `${from}T00:00:00`)
          .lte("created_at", `${to}T23:59:59`),
        // Inscriptions académie payées dans la période
        supabase
          .from("academy_enrollments")
          .select("total,amount_paid,status,created_at")
          .eq("status", "confirmed")
          .gte("created_at", `${from}T00:00:00`)
          .lte("created_at", `${to}T23:59:59`),
      ]);
      if (cancelled) return;
      setReservations((r1.data as ReservationRow[]) ?? []);
      setBalancesCollected((r2.data as ReservationRow[]) ?? []);
      setPayments((r3.data as PaymentRow[]) ?? []);
      setAcademy((r4.data as AcademyRow[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [from, to]);

  // ===== Agrégats =====
  const sum = (xs: (number | null | undefined)[]) =>
    Math.round(xs.reduce((a: number, x) => a + (Number(x) || 0), 0) * 100) / 100;

  const onlineStripe = sum(payments.filter((p) => !p.method || p.method === "stripe").map((p) => (p.amount ?? 0) / 100));
  const balTerminal = sum(balancesCollected.filter((b) => b.balance_method === "terminal").map((b) => b.balance_amount));
  const balCash = sum(balancesCollected.filter((b) => b.balance_method === "cash").map((b) => b.balance_amount));
  const balVirement = sum(balancesCollected.filter((b) => b.balance_method === "virement").map((b) => b.balance_amount));
  const totalEncaisse = sum([onlineStripe, balTerminal, balCash, balVirement]);

  const caFacture = sum(reservations.map((r) => r.total ?? r.price));
  const tps = sum(reservations.map((r) => r.tax_gst));
  const tvq = sum(reservations.map((r) => r.tax_qst));
  const soldesEnAttente = reservations.filter((r) => (r.balance_due ?? 0) > 0);
  const totalSoldesAttente = sum(soldesEnAttente.map((r) => r.balance_due));
  const caAcademie = sum(academy.map((a) => a.amount_paid ?? a.total));

  const parType = useMemo(() => {
    const m = new Map<string, { n: number; total: number }>();
    for (const r of reservations) {
      const k = r.type || "Terrain";
      const cur = m.get(k) ?? { n: 0, total: 0 };
      cur.n += 1;
      cur.total = Math.round((cur.total + Number(r.total ?? r.price ?? 0)) * 100) / 100;
      m.set(k, cur);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [reservations]);

  const exportCSV = () => {
    const lines = [
      ["Période", `${from} au ${to}`],
      [],
      ["ENCAISSEMENTS", "Montant"],
      ["En ligne (Stripe)", onlineStripe.toFixed(2)],
      ["Terminal (accueil)", balTerminal.toFixed(2)],
      ["Comptant (accueil)", balCash.toFixed(2)],
      ["Virement", balVirement.toFixed(2)],
      ["TOTAL ENCAISSÉ", totalEncaisse.toFixed(2)],
      [],
      ["FACTURATION (réservations jouées dans la période)"],
      ["Chiffre d'affaires (taxes incluses)", caFacture.toFixed(2)],
      ["TPS collectée", tps.toFixed(2)],
      ["TVQ collectée", tvq.toFixed(2)],
      ["Académie (inscriptions payées)", caAcademie.toFixed(2)],
      ["Soldes en attente", totalSoldesAttente.toFixed(2)],
      [],
      ["PAR TYPE", "Nb", "Total"],
      ...parType.map(([k, v]) => [k, String(v.n), v.total.toFixed(2)]),
      [],
      ["DÉTAIL RÉSERVATIONS"],
      ["Date", "Client", "Type", "Sous-total", "TPS", "TVQ", "Total", "Payé", "Solde dû"],
      ...reservations.map((r) => [
        r.date, r.user_name, r.type || "Terrain",
        (r.price ?? 0).toFixed(2), (r.tax_gst ?? 0).toFixed(2), (r.tax_qst ?? 0).toFixed(2),
        (r.total ?? 0).toFixed(2), (r.amount_paid ?? 0).toFixed(2), (r.balance_due ?? 0).toFixed(2),
      ]),
    ];
    const csv = lines.map((l) => (l as string[]).map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `comptabilite-soccercity-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const Tile = ({ label, value, accent }: { label: string; value: string; accent?: string }) => (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${accent ?? "text-white"}`}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">📊 Comptabilité</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Du {from} au {to}
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="rounded-md border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          ⬇️ Exporter CSV (comptable)
        </button>
      </header>

      {/* Sélecteur de période */}
      <div className="flex flex-wrap items-center gap-2">
        {([
          ["week", "Cette semaine"],
          ["month", "Ce mois"],
          ["year", "Cette année"],
          ["custom", "Personnalisé"],
        ] as [Period, string][]).map(([p, label]) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              period === p ? "bg-primary font-semibold text-white" : "border border-white/15 text-white/60 hover:border-white/40"
            }`}
          >
            {label}
          </button>
        ))}
        {period === "custom" && (
          <span className="flex items-center gap-2 text-sm">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-md border bg-card px-2 py-1.5" />
            →
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-md border bg-card px-2 py-1.5" />
          </span>
        )}
      </div>

      {loading ? (
        <p className="py-12 text-center text-white/50">Chargement…</p>
      ) : (
        <>
          {/* ===== Encaissements par source ===== */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-white">Argent encaissé</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Tile label="En ligne (Stripe)" value={formatCAD(onlineStripe)} />
              <Tile label="💳 Terminal (accueil)" value={formatCAD(balTerminal)} />
              <Tile label="💵 Comptant" value={formatCAD(balCash)} />
              <Tile label="🏦 Virement" value={formatCAD(balVirement)} />
              <Tile label="Total encaissé" value={formatCAD(totalEncaisse)} accent="text-pitch" />
            </div>
            <p className="mt-2 text-xs text-white/35">
              Stripe = brut (les frais Stripe sont déduits sur le relevé Stripe). Terminal/Comptant = soldes
              encaissés à l'accueil dans la période, d'après les encaissements saisis sur les réservations.
            </p>
          </section>

          {/* ===== Facturation + taxes ===== */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-white">Réservations de la période</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Tile label="Chiffre d'affaires (TTC)" value={formatCAD(caFacture)} />
              <Tile label="TPS collectée" value={formatCAD(tps)} />
              <Tile label="TVQ collectée" value={formatCAD(tvq)} />
              <Tile label="Académie" value={formatCAD(caAcademie)} />
              <Tile
                label={`Soldes en attente (${soldesEnAttente.length})`}
                value={formatCAD(totalSoldesAttente)}
                accent={totalSoldesAttente > 0 ? "text-amber-400" : "text-white"}
              />
            </div>
          </section>

          {/* ===== Par type ===== */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-white">Par type d'activité</h2>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-left">
                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white/40">Type</th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-white/40">Réservations</th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-white/40">Total TTC</th>
                  </tr>
                </thead>
                <tbody>
                  {parType.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-white/40">Aucune réservation sur la période.</td></tr>
                  ) : parType.map(([k, v]) => (
                    <tr key={k} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-2.5 font-medium text-white">{k}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{v.n}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatCAD(v.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ===== Soldes à percevoir ===== */}
          {soldesEnAttente.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-amber-400">
                🟠 Soldes à percevoir à l'accueil ({soldesEnAttente.length})
              </h2>
              <div className="overflow-x-auto rounded-lg border border-amber-500/30">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-amber-500/10 text-left">
                      <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white/50">Date du match</th>
                      <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white/50">Client</th>
                      <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-white/50">Solde dû</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soldesEnAttente
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((r) => (
                        <tr key={r.id} className="border-b border-white/5 last:border-0">
                          <td className="px-4 py-2.5 tabular-nums">{r.date}</td>
                          <td className="px-4 py-2.5">{r.user_name}</td>
                          <td className="px-4 py-2.5 text-right font-bold tabular-nums text-amber-400">
                            {formatCAD(r.balance_due ?? 0)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-white/35">
                Encaissez chaque solde depuis la fiche de la réservation (page Réservations → « Encaisser le solde »).
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
