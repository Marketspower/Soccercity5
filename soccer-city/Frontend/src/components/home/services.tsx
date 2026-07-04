"use client";

import {
  Coffee, CircleParking, DoorOpen, Dumbbell, Lightbulb, Sandwich,
  ShowerHead, Tv, Volleyball, Wifi, Megaphone,
} from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";

const SERVICES = [
  { Icon: DoorOpen, label: "Vestiaires" },
  { Icon: CircleParking, label: "Parking gratuit" },
  { Icon: Lightbulb, label: "Éclairage LED" },
  { Icon: Sandwich, label: "Snack" },
  { Icon: Coffee, label: "Cafétéria" },
  { Icon: ShowerHead, label: "Douches" },
  { Icon: Volleyball, label: "Location de ballons" },
  { Icon: Megaphone, label: "Arbitres certifiés" },
  { Icon: Dumbbell, label: "Coaching" },
  { Icon: Tv, label: "Écran géant" },
  { Icon: Wifi, label: "Wi-Fi gratuit" },
];

export function Services() {
  return (
    <section id="services" className="relative overflow-hidden py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-hero-radial opacity-50" aria-hidden />
      <div className="container relative">
        <Reveal className="mb-14 max-w-2xl">
          <p className="speed-eyebrow mb-4">Services</p>
          <h2 className="display text-4xl sm:text-5xl">Tout est <span className="text-primary">inclus</span> dans l&apos;expérience</h2>
        </Reveal>

        <Stagger className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {SERVICES.map(({ Icon, label }) => (
            <StaggerItem key={label}>
              <div className="group flex flex-col items-center gap-3 rounded-lg glass p-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/50 hover:shadow-glow-sm">
                <Icon className="size-7 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground group-hover:text-foreground">
                  {label}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}