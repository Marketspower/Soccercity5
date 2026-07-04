"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { formatCAD } from "@/lib/utils";

export default function AdminPricing() {
  const { fields, updateField } = useAppStore();
  const [savedId, setSavedId] = useState<string | null>(null);

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
              Tarif actuel : {formatCAD(f.pricePerHour)} / heure
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}