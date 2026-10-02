// lib/event-prices.ts
// Prix PAR JOUR des événements réservables en ligne (Tournoi, Entreprise,
// École, Événement privé, Compétition) — modifiables depuis l'admin
// (page Tarifs), stockés dans la table `settings` comme les taxes,
// avec repli sur les valeurs de config/packages. Aucun redéploiement
// nécessaire pour changer un prix.
import { supabase } from "@/lib/supabase";
import { EVENT_PACKAGES } from "@/config/packages";

/** { "Tournoi": 1200, "Entreprise": 1500, ... } */
export type EventPrices = Record<string, number>;

export const DEFAULT_EVENT_PRICES: EventPrices = Object.fromEntries(
  Object.entries(EVENT_PACKAGES).map(([type, pkg]) => [type, pkg.pricePerDay])
);

/** Clé settings : event_price_<key> (ex. event_price_tournoi). */
const keyFor = (type: string) => `event_price_${EVENT_PACKAGES[type]?.key ?? type}`;

/** Charge les prix depuis Supabase, repli sur les défauts du code. */
export async function loadEventPrices(): Promise<EventPrices> {
  const prices: EventPrices = { ...DEFAULT_EVENT_PRICES };
  try {
    const keys = Object.keys(EVENT_PACKAGES).map(keyFor);
    const { data, error } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", keys);
    if (error) throw error;

    const map = new Map<string, string>(
      (data || []).map((r: { key: string; value: string | null }): [string, string] => [r.key, r.value ?? ""])
    );
    for (const type of Object.keys(EVENT_PACKAGES)) {
      const raw = map.get(keyFor(type));
      const parsed = raw === undefined || raw === "" ? NaN : Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) prices[type] = parsed;
    }
  } catch (error) {
    console.error("❌ Erreur loadEventPrices (défauts utilisés):", error);
  }
  return prices;
}

/** Enregistre les prix (admin). */
export async function saveEventPrices(prices: EventPrices): Promise<void> {
  const rows = Object.keys(EVENT_PACKAGES).map((type) => ({
    key: keyFor(type),
    value: String(prices[type] ?? DEFAULT_EVENT_PRICES[type]),
  }));
  const { error } = await supabase.from("settings").upsert(rows, { onConflict: "key" });
  if (error) throw error;
}
