// app/admin/avis/page.tsx — modération des avis clients
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Check, EyeOff, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

interface ReviewRow {
  id: string;
  author: string;
  rating: number;
  text: string;
  email: string | null;
  approved: boolean;
  verified: boolean | null;
  created_at: string;
}

export default function AdminReviews() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reviews")
      .select("id, author, rating, text, email, approved, verified, created_at")
      .order("created_at", { ascending: false });
    if (error) setError("Lecture impossible. Avez-vous exécuté la migration SQL « avis et FAQ » ?");
    setRows((data as ReviewRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const shown = useMemo(
    () => rows.filter((r) => filter === "all" || (filter === "pending" ? !r.approved : r.approved)),
    [rows, filter]
  );
  const pendingCount = rows.filter((r) => !r.approved).length;

  const setApproved = async (id: string, approved: boolean) => {
    const { error } = await supabase.from("reviews").update({ approved }).eq("id", id);
    if (error) setError(error.message);
    load();
  };
  const remove = async (id: string) => {
    if (!window.confirm("Supprimer définitivement cet avis ?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) setError(error.message);
    load();
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Avis clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pendingCount} avis en attente. Seuls les avis approuvés s&apos;affichent sur le site.
            Les clients reçoivent automatiquement une demande d&apos;avis le lendemain de leur visite.
          </p>
        </div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="w-44">
          <option value="pending">En attente</option>
          <option value="approved">Publiés</option>
          <option value="all">Tous</option>
        </Select>
      </header>

      {error && <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : shown.length === 0 ? (
        <p className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Aucun avis ici pour l&apos;instant.
        </p>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {shown.map((r) => (
            <li key={r.id} className="rounded-lg border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-bold">
                    {r.author}
                    {r.verified && (
                      <span className="inline-flex items-center gap-1 text-xs font-normal text-primary">
                        <BadgeCheck className="size-3.5" /> client vérifié
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" })}
                    {r.email ? ` · ${r.email}` : ""}
                  </p>
                  <div className="mt-1 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`size-4 ${i < r.rating ? "fill-primary text-primary" : "text-muted"}`} />
                    ))}
                  </div>
                </div>
                <Badge variant={r.approved ? "pitch" : "warning"}>{r.approved ? "Publié" : "En attente"}</Badge>
              </div>
              <p className="mt-3 whitespace-pre-wrap rounded-md bg-secondary/60 p-3 text-sm leading-relaxed">{r.text}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {r.approved ? (
                  <Button variant="outline" size="sm" onClick={() => setApproved(r.id, false)}>
                    <EyeOff /> Retirer du site
                  </Button>
                ) : (
                  <Button variant="pitch" size="sm" onClick={() => setApproved(r.id, true)}>
                    <Check /> Publier
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => remove(r.id)}>
                  <Trash2 /> Supprimer
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
