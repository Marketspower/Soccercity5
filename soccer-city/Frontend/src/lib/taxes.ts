// lib/taxes.ts
// Taxes de vente (Québec) : TPS fédérale + TVQ provinciale.
// Les taux et numéros d'inscription sont modifiables depuis l'admin (table
// Supabase `settings`, clé/valeur) avec repli sur les valeurs par défaut,
// afin qu'un changement de taux ne demande aucun redéploiement.

import { supabase } from "@/lib/supabase";

export interface TaxSettings {
  /** Taux de TPS en pourcentage (ex. 5 pour 5 %). */
  gstRate: number;
  /** Taux de TVQ en pourcentage (ex. 9.975 pour 9,975 %). */
  qstRate: number;
  /** Numéro d'inscription TPS (ex. « 123456789 RT0001 »). Vide si non fourni. */
  gstNumber: string;
  /** Numéro d'inscription TVQ (ex. « 1234567890 TQ0001 »). Vide si non fourni. */
  qstNumber: string;
}

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  gstRate: 5,
  qstRate: 9.975,
  gstNumber: "",
  qstNumber: "",
};

export interface TaxBreakdown {
  subtotal: number;
  gst: number;
  qst: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Calcule TPS + TVQ sur un sous-total (chaque taxe arrondie au cent). */
export function computeTaxes(
  subtotal: number,
  settings: TaxSettings = DEFAULT_TAX_SETTINGS
): TaxBreakdown {
  const base = round2(Math.max(0, subtotal));
  const gst = round2(base * (settings.gstRate / 100));
  const qst = round2(base * (settings.qstRate / 100));
  return { subtotal: base, gst, qst, total: round2(base + gst + qst) };
}

/** Clés utilisées dans la table `settings`. */
const KEYS = {
  gstRate: "tax_gst_rate",
  qstRate: "tax_qst_rate",
  gstNumber: "tax_gst_number",
  qstNumber: "tax_qst_number",
} as const;

/** Charge les réglages de taxes depuis Supabase, avec repli sur les défauts. */
export async function loadTaxSettings(): Promise<TaxSettings> {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", Object.values(KEYS));

    if (error) throw error;

    const map = new Map<string, string>(
      (data || []).map((row: { key: string; value: string | null }): [string, string] => [row.key, row.value ?? ""])
    );

    const num = (key: string, fallback: number) => {
      const raw = map.get(key);
      const parsed = raw === undefined || raw === "" ? NaN : Number(raw);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
    };

    return {
      gstRate: num(KEYS.gstRate, DEFAULT_TAX_SETTINGS.gstRate),
      qstRate: num(KEYS.qstRate, DEFAULT_TAX_SETTINGS.qstRate),
      gstNumber: map.get(KEYS.gstNumber) ?? DEFAULT_TAX_SETTINGS.gstNumber,
      qstNumber: map.get(KEYS.qstNumber) ?? DEFAULT_TAX_SETTINGS.qstNumber,
    };
  } catch (error) {
    console.error("❌ Erreur loadTaxSettings (repli sur les défauts):", error);
    return { ...DEFAULT_TAX_SETTINGS };
  }
}

/** Enregistre les réglages de taxes (upsert clé/valeur). */
export async function saveTaxSettings(settings: TaxSettings): Promise<void> {
  const rows = [
    { key: KEYS.gstRate, value: String(settings.gstRate) },
    { key: KEYS.qstRate, value: String(settings.qstRate) },
    { key: KEYS.gstNumber, value: settings.gstNumber.trim() },
    { key: KEYS.qstNumber, value: settings.qstNumber.trim() },
  ];
  const { error } = await supabase.from("settings").upsert(rows, { onConflict: "key" });
  if (error) throw error;
}
