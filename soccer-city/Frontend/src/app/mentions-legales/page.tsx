import type { Metadata } from "next";
import { CONTACT } from "@/lib/data";

export const metadata: Metadata = { 
  title: "Mentions légales" 
};

export default function MentionsLegales() {
  return (
    <div className="container max-w-3xl pt-32 pb-24">
      <p className="speed-eyebrow mb-4">Informations légales</p>
      <h1 className="text-4xl font-bold mb-10">Mentions légales</h1>
      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-bold text-foreground mb-2">Éditeur du site</h2>
          <p>Soccer City inc. — {CONTACT.address}<br />Téléphone : {CONTACT.phone} · Courriel : {CONTACT.email}</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-foreground mb-2">Hébergement</h2>
          <p>Ce site est hébergé par un fournisseur d&apos;infonuagique.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-foreground mb-2">Propriété intellectuelle</h2>
          <p>L&apos;ensemble des contenus (logo, textes, visuels, structure) est la propriété exclusive de Soccer City inc.</p>
        </section>
      </div>
    </div>
  );
}