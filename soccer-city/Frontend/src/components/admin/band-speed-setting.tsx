// components/admin/band-speed-setting.tsx
// Vitesse de défilement des bandes de photos/vidéos sur le site (enregistrée tout de suite).
"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { BAND_SPEEDS, loadBandSpeed, saveBandSpeed, type BandSpeed } from "@/lib/media-bands";

export function BandSpeedSetting({ compact = false }: { compact?: boolean }) {
  const [speed, setSpeed] = useState<BandSpeed | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    loadBandSpeed(true).then(setSpeed);
  }, []);

  const choose = async (s: BandSpeed) => {
    const before = speed;
    setSpeed(s);
    setStatus(null);
    try {
      await saveBandSpeed(s);
      setStatus({ ok: true, text: "Enregistré" });
    } catch (e: any) {
      setSpeed(before);
      setStatus({ ok: false, text: e?.message || "Enregistrement impossible" });
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 ${compact ? "" : "rounded-lg border bg-card p-4"}`}>
      <span className="text-sm font-medium">Vitesse de défilement des photos et vidéos sur le site :</span>
      <div className="inline-flex overflow-hidden rounded-md border" role="radiogroup" aria-label="Vitesse de défilement">
        {BAND_SPEEDS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={speed === o.value}
            disabled={speed === null}
            onClick={() => choose(o.value)}
            className={`px-3 py-1.5 text-sm transition-colors ${speed === o.value ? "bg-primary text-white" : "hover:bg-muted"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {status && (
        <span className={`inline-flex items-center gap-1 text-xs ${status.ok ? "text-green-500" : "text-destructive"}`}>
          {status.ok && <Check className="size-3.5" />} {status.text}
        </span>
      )}
    </div>
  );
}
