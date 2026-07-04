import { cn } from "@/lib/utils";

export function SpeedLines({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 40" fill="none" aria-hidden className={cn("text-primary", className)}>
      <path d="M0 6 H78 L70 12 H-8 Z" fill="currentColor" opacity=".9" transform="skewX(-24)" />
      <path d="M18 18 H74 L66 24 H10 Z" fill="currentColor" opacity=".55" transform="skewX(-24)" />
      <path d="M36 30 H70 L62 36 H28 Z" fill="currentColor" opacity=".3" transform="skewX(-24)" />
    </svg>
  );
}