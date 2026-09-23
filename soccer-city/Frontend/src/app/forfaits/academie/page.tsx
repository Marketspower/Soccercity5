// app/forfaits/academie/page.tsx
// Inscription à l'académie : choix du groupe (places limitées) →
// coordonnées → paiement (totalité ou acompte).
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  computeTaxes,
  computeDeposit,
  loadTaxSettings,
  loadPaymentSettings,
  DEFAULT_TAX_SETTINGS,
  DEFAULT_PAYMENT_SETTINGS,
  type TaxSettings,
  type PaymentSettings,
} from "@/lib/taxes";
import { ACADEMIE, type AcademyGroup } from "@/config/packages";
import { PaymentOptions } from "@/components/booking/payment-options";
import type { PaymentOption } from "@/lib/types";

const fmt = (n: number) => `${n.toFixed(2)} $`;

export default function AcademiePage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [group, setGroup] = useState<AcademyGroup | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [payOption, setPayOption] = useState<PaymentOption>("full");
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);
  const [paySettings, setPaySettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTaxSettings().then(setTaxSettings).catch(() => {});
    loadPaymentSettings().then(setPaySettings).catch(() => {});
    fetch("/api/academy-availability")
      .then((r) => r.json())
      .then((d) => setCounts(d.counts || {}))
      .catch(() => {});
  }, []);

  const left = (g: AcademyGroup) => Math.max(0, g.capacity - (counts[g.key] || 0));

  const taxes = computeTaxes(ACADEMIE.price, taxSettings);
  const { deposit } = computeDeposit(taxes.total, paySettings);

  const handlePay = async () => {
    if (!group) return;
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Veuillez remplir votre nom, courriel et téléphone.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "academie",
          groupKey: group.key,
          userName: form.name,
          userEmail: form.email,
          userPhone: form.phone,
          paymentOption: payOption,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création du paiement");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen pt-28 pb-24 md:pt-36">
      <div className="container relative mx-auto max-w-2xl">
        <Link href="/forfaits" className="text-sm font-semibold text-primary hover:underline">
          ← Retour aux forfaits
        </Link>
        <h1 className="display mt-3 text-3xl sm:text-4xl">
          🎓 <span className="text-primary">Académie</span> Soccer City
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ACADEMIE.price} $ / {ACADEMIE.period} + taxes · {ACADEMIE.sessionsPerWeek}{" "}
          entraînements par semaine. {ACADEMIE.objectifs}
        </p>

        {/* ===== Étape 1 : le groupe ===== */}
        <h2 className="mt-8 mb-3 text-lg font-bold">1. Choisissez votre groupe</h2>
        <div className="space-y-3">
          {ACADEMIE.groups.map((g) => {
            const remaining = left(g);
            const full = remaining === 0;
            const low = !full && remaining <= 3;
            const sel = group?.key === g.key;
            return (
              <button
                key={g.key}
                type="button"
                disabled={full}
                onClick={() => setGroup(g)}
                className={[
                  "flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors",
                  full ? "cursor-not-allowed opacity-50" : "hover:border-primary/60",
                  sel ? "border-primary bg-primary/10" : "bg-card/60",
                ].join(" ")}
              >
                <span>
                  <span className="block font-bold">{g.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {g.schedule} · {ACADEMIE.sessionsPerWeek} entraînements / semaine
                  </span>
                </span>
                <span
                  className={[
                    "whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold",
                    full
                      ? "bg-destructive/15 text-destructive"
                      : low
                        ? "bg-amber-500/15 text-amber-500"
                        : "bg-pitch/15 text-pitch",
                  ].join(" ")}
                >
                  {full ? "Complet" : `${remaining} place${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* ===== Étape 2 : coordonnées + paiement ===== */}
        {group && (
          <>
            <h2 className="mt-8 mb-3 text-lg font-bold">2. Coordonnées et paiement</h2>
            <div className="mb-4 rounded-xl border bg-card/60 p-4 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Groupe</span>
                <span>{group.label}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Horaire</span>
                <span className="text-right">{group.schedule}</span>
              </div>
              <div className="mt-2 border-t pt-2">
                <div className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">Sous-total (1 {ACADEMIE.period})</span>
                  <span>{fmt(taxes.subtotal)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">TPS ({taxSettings.gstRate} %)</span>
                  <span>{fmt(taxes.gst)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">TVQ ({taxSettings.qstRate} %)</span>
                  <span>{fmt(taxes.qst)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 font-bold">
                  <span>Total</span>
                  <span>{fmt(taxes.total)} CAD</span>
                </div>
              </div>
            </div>

            <div className="mb-4 space-y-3">
              <input
                type="text"
                placeholder="Nom complet du joueur (ou du parent)"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-md border bg-card px-4 py-2.5 outline-none focus:border-primary"
              />
              <input
                type="email"
                placeholder="Courriel"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-md border bg-card px-4 py-2.5 outline-none focus:border-primary"
              />
              <input
                type="tel"
                placeholder="Téléphone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-md border bg-card px-4 py-2.5 outline-none focus:border-primary"
              />
            </div>

            <PaymentOptions
              taxes={taxes}
              settings={paySettings}
              value={payOption}
              onChange={setPayOption}
            />

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

            <button
              type="button"
              onClick={handlePay}
              disabled={loading}
              className="mt-5 w-full rounded-md bg-primary py-3.5 font-display font-extrabold uppercase italic tracking-wider text-primary-foreground transition-opacity hover:bg-primary-bright disabled:opacity-60"
            >
              {loading
                ? "Redirection vers le paiement…"
                : payOption === "deposit"
                  ? `Payer l'acompte de ${fmt(deposit)}`
                  : `Payer ${fmt(taxes.total)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
