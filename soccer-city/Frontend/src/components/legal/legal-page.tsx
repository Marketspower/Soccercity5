// components/legal/legal-page.tsx — mise en page commune des pages légales
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro?: React.ReactNode;
  sections: { id: string; title: string; body: React.ReactNode }[];
}) {
  return (
    <div className="container max-w-3xl pt-32 pb-24">
      <div className="mb-6">
        <Link href="/" className="text-sm text-primary hover:underline">← Retour au site</Link>
      </div>
      <p className="speed-eyebrow mb-4">{eyebrow}</p>
      <h1 className="text-4xl font-bold">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">Dernière mise à jour : {LEGAL.lastUpdated}</p>
      {intro && <div className="mt-6 text-sm leading-relaxed text-muted-foreground">{intro}</div>}

      <nav aria-label="Sommaire" className="mt-8 rounded-lg border bg-card p-5">
        <p className="mb-2 text-sm font-semibold">Sommaire</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="hover:text-primary">{s.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-10 text-sm leading-relaxed text-muted-foreground">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-28">
            <h2 className="mb-3 text-lg font-bold text-foreground">{i + 1}. {s.title}</h2>
            <div className="space-y-3 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">{s.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
