// lib/server/rate-limit.ts
// Limite anti-spam partagée entre toutes les instances (table rate_limits
// + fonction SQL hit_rate_limit). Repli en mémoire si la fonction SQL
// n'est pas encore installée.
import "server-only";
import type { NextRequest } from "next/server";
import { getSupabaseAdmin } from "./supabase-admin";

const memory = new Map<string, number[]>();

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "inconnu";
}

/**
 * Renvoie true si l'action est autorisée, false si la limite est atteinte.
 * @param key     identifiant (ex. "event-request:1.2.3.4")
 * @param max     nombre d'actions autorisées dans la fenêtre
 * @param windowS durée de la fenêtre en secondes
 */
export async function rateLimit(key: string, max: number, windowS: number): Promise<boolean> {
  try {
    const { data, error } = await getSupabaseAdmin().rpc("hit_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowS,
    });
    if (error) throw error;
    return data === true;
  } catch {
    const now = Date.now();
    const hits = (memory.get(key) || []).filter((t) => now - t < windowS * 1000);
    if (hits.length >= max) {
      memory.set(key, hits);
      return false;
    }
    hits.push(now);
    memory.set(key, hits);
    return true;
  }
}
