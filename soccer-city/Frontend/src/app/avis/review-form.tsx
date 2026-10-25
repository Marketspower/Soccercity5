"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const LABELS = ["", "Décevant", "Moyen", "Bien", "Très bien", "Excellent"];

export function ReviewForm() {
  const token = useSearchParams().get("t") || "";
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [author, setAuthor] = useState("");
  const [email, setEmail] = useState("");
  const [text, setText] = useState("");
  const [website, setWebsite] = useState(""); // champ piège anti-robot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!rating) return setError("Choisissez une note en cliquant sur les étoiles.");
    setBusy(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, email, text, rating, token, website }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Envoi impossible.");
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-lg border bg-card p-10 text-center">
        <span className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Check className="size-8" strokeWidth={3} />
        </span>
        <h2 className="display text-2xl">Merci pour votre avis !</h2>
        <p className="mt-2 text-sm text-muted-foreground">Il apparaîtra sur le site après vérification par notre équipe.</p>
        <Link href="/" className="mt-6 inline-block text-primary hover:underline">← Retour à l&apos;accueil</Link>
      </div>
    );
  }

  const shown = hover || rating;
  return (
    <form onSubmit={submit} noValidate className="glass relative space-y-5 rounded-lg p-7 md:p-9">
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>Site web<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
      </div>

      <div className="text-center">
        <Label className="mb-3 block">Votre note *</Label>
        <div className="flex justify-center gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Note sur 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
              onClick={() => { setRating(n); setError(""); }}
              onMouseEnter={() => setHover(n)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star className={`size-9 ${n <= shown ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />
            </button>
          ))}
        </div>
        <p className="mt-1 h-5 text-sm text-muted-foreground">{LABELS[shown]}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="r-text">Votre expérience *</Label>
        <Textarea id="r-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={1500}
          placeholder="Qualité du terrain, accueil, ambiance…" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="r-author">Prénom (affiché) *</Label>
          <Input id="r-author" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={60} placeholder="Alex T." autoComplete="given-name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="r-email">Courriel (jamais affiché)</Label>
          <Input id="r-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="facultatif" autoComplete="email" />
        </div>
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      <Button type="submit" variant="brand" size="lg" className="w-full" disabled={busy}>
        {busy ? "Envoi…" : "Publier mon avis"}
      </Button>
    </form>
  );
}
