// app/admin/faq/page.tsx — questions fréquentes modifiables
"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";

interface FaqRow {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  published: boolean;
}

export default function AdminFaq() {
  const [rows, setRows] = useState<FaqRow[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("faqs").select("*").order("sort_order", { ascending: true });
    if (error) setError("Lecture impossible. Avez-vous exécuté la migration SQL « avis et FAQ » ?");
    setRows((data as FaqRow[]) || []);
    setDirty(new Set());
  }, []);

  useEffect(() => { load(); }, [load]);

  const edit = (id: string, patch: Partial<FaqRow>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty((d) => new Set(d).add(id));
    setSaved("");
  };

  const saveAll = async () => {
    setError("");
    for (const r of rows.filter((r) => dirty.has(r.id))) {
      if (r.published && (!r.question.trim() || !r.answer.trim() || /À COMPLÉTER/i.test(r.answer))) {
        setError(`« ${r.question || "Question sans titre"} » : complétez la réponse avant de la publier.`);
        return;
      }
      const { error } = await supabase
        .from("faqs")
        .update({
          question: r.question.trim(),
          answer: r.answer.trim(),
          published: r.published,
          sort_order: r.sort_order,
          updated_at: new Date().toISOString(),
        })
        .eq("id", r.id);
      if (error) { setError(error.message); return; }
    }
    setSaved("Modifications enregistrées : la FAQ du site est à jour.");
    load();
  };

  const add = async () => {
    const next = (rows.at(-1)?.sort_order ?? 0) + 1;
    const { error } = await supabase
      .from("faqs")
      .insert({ question: "Nouvelle question", answer: "À COMPLÉTER", sort_order: next, published: false });
    if (error) setError(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Supprimer cette question ?")) return;
    const { error } = await supabase.from("faqs").delete().eq("id", id);
    if (error) setError(error.message);
    load();
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= rows.length) return;
    const copy = [...rows];
    [copy[index], copy[j]] = [copy[j], copy[index]];
    const renumbered = copy.map((r, i) => ({ ...r, sort_order: i + 1 }));
    setRows(renumbered);
    setDirty(new Set(renumbered.map((r) => r.id)));
    setSaved("");
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">FAQ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seules les questions <b>publiées</b> apparaissent sur le site, dans l&apos;ordre ci-dessous.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={add}><Plus /> Ajouter une question</Button>
          <Button variant="brand" onClick={saveAll} disabled={dirty.size === 0}><Save /> Enregistrer</Button>
        </div>
      </header>

      {error && <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
      {saved && <p className="rounded-md bg-green-500/10 px-4 py-3 text-sm text-green-500">{saved}</p>}

      <ul className="space-y-4">
        {rows.map((r, i) => (
          <li key={r.id} className={`rounded-lg border bg-card p-5 ${r.published ? "" : "opacity-80"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0} title="Monter"><ArrowUp /></Button>
                <Button variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === rows.length - 1} title="Descendre"><ArrowDown /></Button>
                <span className="text-xs text-muted-foreground">#{i + 1}</span>
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-sm">{r.published ? "Publiée" : "Brouillon"}</Label>
                <Switch checked={r.published} onCheckedChange={(v) => edit(r.id, { published: v })} />
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)} title="Supprimer"><Trash2 /></Button>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <Label>Question</Label>
              <Input value={r.question} onChange={(e) => edit(r.id, { question: e.target.value })} />
              <Label>Réponse</Label>
              <Textarea value={r.answer} onChange={(e) => edit(r.id, { answer: e.target.value })} />
              {/À COMPLÉTER/i.test(r.answer) && (
                <p className="text-xs text-amber-500">À compléter avant publication.</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
