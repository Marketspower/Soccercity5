// lib/server/admin-auth.ts
// Vérifie qu'une requête API vient d'un administrateur connecté.
// Le navigateur envoie « Authorization: Bearer <access_token Supabase> ».
import "server-only";
import type { NextRequest } from "next/server";
import { getSupabaseAdmin } from "./supabase-admin";

export async function requireAdmin(
  req: NextRequest
): Promise<{ ok: true; userId: string; email: string | null } | { ok: false; status: number; error: string }> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { ok: false, status: 401, error: "Non connecté" };

  const supabaseAdmin = getSupabaseAdmin();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { ok: false, status: 401, error: "Session invalide" };

  const { data: row } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (row?.role !== "admin") return { ok: false, status: 403, error: "Accès administrateur requis" };
  return { ok: true, userId: user.id, email: user.email ?? null };
}
