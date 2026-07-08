"use client";

import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { PRICING } from "@/lib/data";
import { formatCAD, cn } from "@/lib/utils";
import type { PricingPlan } from "@/lib/types";

export function Pricing() {
  // Typer explicitement les données
  const pricingData: PricingPlan[] = PRICING;

  return (
    <section id="tarifs" className="container py-24 md:py-32">
      <Reveal className="mb-14 max-w-2xl">
        <p className="speed-eyebrow mb-4">Tarifs</p>
        <h2 className="display text-4xl sm:text-5xl">Des prix <span className="text-primary">clairs</span>, sans surprise</h2>
        <p className="mt-4 text-muted-foreground">Éclairage, vestiaires et stationnement toujours inclus. Taxes en sus.</p>
      </Reveal>

      <Stagger className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {pricingData.map((plan) => (
          <StaggerItem key={plan.id} className="h-full">
            <article
              className={cn(
                "card-hover relative flex h-full flex-col rounded-lg border bg-card p-7",
                plan.highlighted && "glow-ring border-primary/40 shadow-glow-sm"
              )}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-6 font-display uppercase italic tracking-wider">
                  Populaire
                </Badge>
              )}
              <h3 className="font-display text-sm font-bold uppercase italic tracking-widest text-muted-foreground">
                {plan.name}
              </h3>
              <p className="mt-3 font-display text-5xl font-extrabold italic">
                {formatCAD(plan.price)}
                <span className="ml-1 text-sm font-medium not-italic text-muted-foreground">
                  {plan.unit}
                </span>
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature: string) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-pitch" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button asChild variant={plan.highlighted ? "brand" : "outline"} className="mt-8 w-full group">
                <Link href={plan.price > 200 ? "/evenements" : "/reservation"}>
                  Choisir cette offre
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
