"use client";

import { Counter } from "@/components/motion/counter";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, suffix = "", Icon, accent = false,
}: {
  label: string; value: number; suffix?: string; Icon: React.ElementType; accent?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border p-5", accent ? "bg-primary text-white shadow-glow-sm" : "bg-card")}>
      <div className="flex items-center justify-between">
        <p className={cn("text-xs font-semibold uppercase tracking-wider", accent ? "text-white/70" : "text-muted-foreground")}>{label}</p>
        <Icon className={cn("size-4", accent ? "text-white/80" : "text-primary")} />
      </div>
      <p className="mt-2 font-display text-3xl font-extrabold italic tabular-nums">
        <Counter value={value} suffix={suffix} duration={1.2} />
      </p>
    </div>
  );
}
