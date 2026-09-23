// app/forfaits/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ANNIVERSAIRE, ACADEMIE } from "@/config/packages";

export const metadata: Metadata = {
  title: "Forfaits",
  description:
    "Forfait anniversaire clé en main et académie de soccer — réservez en ligne, payez la totalité ou 65 % à la réservation.",
};

function Timeline({ rows }: { rows: readonly { duration: string; label: string }[] }) {
  return (
    <div className="mb-5 space-y-0">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[64px_14px_1fr] gap-2.5 py-1.5 text-sm">
          <span className="text-right text-xs font-bold text-primary">{r.duration}</span>
          <span className="relative mt-1 block size-2.5 rounded-full bg-primary">
            {i < rows.length - 1 && (
              <span className="absolute left-1 top-3 h-6 w-0.5 bg-primary/35" />
            )}
          </span>
          <span>{r.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function ForfaitsPage() {
  return (
    <div className="relative min-h-screen pt-28 pb-24 md:pt-36">
      <div className="container relative">
        <header className="mx-auto mb-14 max-w-3xl text-center">
          <p className="speed-eyebrow mb-4 justify-center">Tarifs &amp; Forfaits</p>
          <h1 className="display text-4xl sm:text-6xl">
            Choisissez votre <span className="text-primary">expérience</span>
          </h1>
          <p className="mt-5 text-muted-foreground">
            Une fête inoubliable ou un vrai parcours de formation. Payez la
            totalité en ligne, ou réservez avec un acompte et réglez le reste le
            jour même.
          </p>
        </header>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {/* ===== Anniversaire ===== */}
          <div className="relative flex flex-col rounded-2xl border border-primary/50 bg-gradient-to-b from-primary/10 to-card/60 p-7">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1 text-[11px] font-extrabold uppercase tracking-widest text-primary-foreground">
              🎂 Le plus populaire
            </span>
            <p className="text-3xl">🎉</p>
            <h2 className="display mt-2 text-2xl">{ANNIVERSAIRE.label}</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              2 h 30 clé en main — on s&apos;occupe de tout
            </p>
            <p className="font-display text-4xl font-black italic">
              {ANNIVERSAIRE.price}&nbsp;$
              <span className="ml-2 text-sm font-semibold not-italic text-muted-foreground">
                / groupe + taxes
              </span>
            </p>
            <hr className="my-4 border-dashed border-border" />
            <Timeline rows={ANNIVERSAIRE.timeline} />
            <ul className="mb-6 space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="font-bold text-pitch">✓</span> Animateur dédié du
                début à la fin
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-pitch">✓</span> Espace fête privé
                pour le groupe
              </li>
            </ul>
            <Link
              href="/forfaits/anniversaire"
              className="mt-auto rounded-lg bg-primary py-3.5 text-center font-display font-extrabold uppercase italic tracking-wider text-primary-foreground transition-colors hover:bg-primary-bright"
            >
              Réserver la fête
            </Link>
          </div>

          {/* ===== Académie ===== */}
          <div className="flex flex-col rounded-2xl border bg-card/60 p-7">
            <p className="text-3xl">🎓</p>
            <h2 className="display mt-2 text-2xl">{ACADEMIE.label}</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {ACADEMIE.sessionsPerWeek} entraînements par semaine
            </p>
            <p className="font-display text-4xl font-black italic">
              {ACADEMIE.price}&nbsp;$
              <span className="ml-2 text-sm font-semibold not-italic text-muted-foreground">
                / {ACADEMIE.period} + taxes
              </span>
            </p>
            <hr className="my-4 border-dashed border-border" />
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Déroulement d&apos;une séance
            </p>
            <Timeline rows={ACADEMIE.seance} />
            <div className="mb-6 rounded-xl border border-primary/25 bg-primary/10 p-3.5 text-xs leading-relaxed text-foreground/80">
              <p className="mb-1 font-bold uppercase tracking-widest text-primary">
                Objectifs de l&apos;académie
              </p>
              {ACADEMIE.objectifs}
            </div>
            <Link
              href="/forfaits/academie"
              className="mt-auto rounded-lg border border-border py-3.5 text-center font-display font-extrabold uppercase italic tracking-wider transition-colors hover:border-primary hover:text-primary"
            >
              S&apos;inscrire à l&apos;académie
            </Link>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-3xl rounded-xl border border-dashed bg-card/60 p-4 text-center text-xs text-muted-foreground">
          💳 Les options « Payer la totalité » et « Réserver avec acompte »
          s&apos;appliquent à toutes les réservations du site : forfaits,
          événements et{" "}
          <Link href="/reservation" className="font-bold text-primary hover:underline">
            location de terrain à l&apos;heure
          </Link>{" "}
          (acompte offert à partir de 200&nbsp;$, soit 2&nbsp;h et plus).
        </p>
      </div>
    </div>
  );
}
