"use client";

import { useEffect, useState } from "react";
import { Check, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/store";
import { formatCAD } from "@/lib/utils";
import {
  DEFAULT_TAX_SETTINGS,
  computeTaxes,
  loadTaxSettings,
  saveTaxSettings,
  type TaxSettings,
} from "@/lib/taxes";

export default function AdminPricing() {
  const { fields, updateField } = useAppStore();
  const [savedId, setSavedId] = useState<string | null>(null);

  // ===== Réglages de taxes (TPS / TVQ + numéros d'inscription) =====
  const [taxes, setTaxes] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);
  const [taxState, setTaxState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    loadTaxSettings().then(setTaxes).catch(() => {});
  }, []);

  const handleSaveTaxes = async () => {
    setTaxState("saving");
    try {
      await saveTaxSettings(taxes);
      setTaxState("saved");
      setTimeout(() => setTaxState("idle"), 1800);
    } catch (error) {
      console.error("❌ Erreur enregistrement des taxes:", error);
      setTaxState("error");
    }
  };

  // Aperçu : 130 $ pour visualiser l'effet des taux saisis
  const preview = computeTaxes(130, taxes);

  return (
    <div className="space-y-8 p-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Tarifs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Le prix horaire de chaque terrain s&apos;applique immédiatement.
        </p>
      </header>

      <ul className="grid gap-4 md:grid-cols-2">
        {fields.map((f) => (
          <li key={f.id} className="rounded-lg border bg-card p-5">
            <p className="font-display text-lg font-bold">{f.name}</p>
            <p className="text-xs text-muted-foreground">
              {f.dimensions} · {f.players}
            </p>
            <form
              className="mt-4 flex items-center gap-3"
              onSubmit={(ev) => {
                ev.preventDefault();
                const input = ev.currentTarget.elements.namedItem("price") as HTMLInputElement;
                updateField(f.id, { pricePerHour: Number(input.value) });
                setSavedId(f.id);
                setTimeout(() => setSavedId(null), 1600);
              }}
            >
              <div className="relative flex-1">
                <Input
                  name="price"
                  type="number"
                  min={0}
                  step={5}
                  defaultValue={f.pricePerHour}
                  className="pr-14 text-lg font-bold italic tabular-nums"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  $ / h
                </span>
              </div>
              <Button 
                type="submit" 
                variant={savedId === f.id ? "pitch" : "brand"} 
                className="w-36"
              >
                {savedId === f.id ? <><Check /> Enregistré</> : "Mettre à jour"}
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              Tarif actuel : {formatCAD(f.pricePerHour)} / heure ·{" "}
              {formatCAD(computeTaxes(f.pricePerHour, taxes).total)} taxes incluses
            </p>
          </li>
        ))}
      </ul>

      {/* ===== Section Taxes (TPS / TVQ) ===== */}
      <section className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2">
          <Percent className="size-5 text-primary" />
          <h2 className="text-xl font-bold">Taxes (TPS / TVQ)</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Appliquées à chaque paiement en ligne. Les numéros d&apos;inscription
          apparaissent sur le récapitulatif du client dès qu&apos;ils sont remplis.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tax-gst-rate">Taux de TPS (%)</Label>
            <Input
              id="tax-gst-rate"
              type="number"
              min={0}
              step={0.001}
              value={taxes.gstRate}
              onChange={(e) => setTaxes((t) => ({ ...t, gstRate: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax-qst-rate">Taux de TVQ (%)</Label>
            <Input
              id="tax-qst-rate"
              type="number"
              min={0}
              step={0.001}
              value={taxes.qstRate}
              onChange={(e) => setTaxes((t) => ({ ...t, qstRate: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax-gst-number">Numéro de TPS</Label>
            <Input
              id="tax-gst-number"
              placeholder="123456789 RT0001"
              value={taxes.gstNumber}
              onChange={(e) => setTaxes((t) => ({ ...t, gstNumber: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax-qst-number">Numéro de TVQ</Label>
            <Input
              id="tax-qst-number"
              placeholder="1234567890 TQ0001"
              value={taxes.qstNumber}
              onChange={(e) => setTaxes((t) => ({ ...t, qstNumber: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Aperçu : 130,00 $ → TPS {preview.gst.toFixed(2)} $ + TVQ {preview.qst.toFixed(2)} $ ={" "}
            <b className="text-foreground">{preview.total.toFixed(2)} $</b>
          </p>
          <Button
            onClick={handleSaveTaxes}
            disabled={taxState === "saving"}
            variant={taxState === "saved" ? "pitch" : "brand"}
            className="w-44"
          >
            {taxState === "saving" && "Enregistrement…"}
            {taxState === "saved" && <><Check /> Enregistré</>}
            {(taxState === "idle" || taxState === "error") && "Enregistrer les taxes"}
          </Button>
        </div>
        {taxState === "error" && (
          <p className="mt-2 text-sm text-destructive">
            Impossible d&apos;enregistrer. Vérifie que la table « settings » existe (voir le SQL fourni).
          </p>
        )}
      </section>
    </div>
  );
}
