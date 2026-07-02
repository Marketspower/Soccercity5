import type { Metadata } from "next";
import { CONTACT } from "@/lib/data";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegales() {
  return (
    <div className="container max-w-3xl pt-32 pb-24">
      <p className="speed-eyebrow mb-4">Informations légales</p>
      <h1 className="display mb-10 text-4xl">Mentions légales</h1>
      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground">
        <section>
          <h2>Éditeur du site</h2>
          <p>Soccer City inc. — {CONTACT.address}<br />Téléphone : {CONTACT.phone} · Courriel : {CONTACT.email}</p>
        </section>
        <section>
          <h2>Hébergement</h2>
          <p>Ce site est hébergé par un fournisseur d&apos;infonuagique. Les coordonnées complètes de l&apos;hébergeur sont disponibles sur demande.</p>
        </section>
        <section>
          <h2>Propriété intellectuelle</h2>
          <p>L&apos;ensemble des contenus (logo, textes, visuels, structure) est la propriété exclusive de Soccer City inc. Toute reproduction sans autorisation écrite est interdite.</p>
        </section>
        <section>
          <h2>Responsabilité</h2>
          <p>Soccer City s&apos;efforce d&apos;assurer l&apos;exactitude des informations publiées (horaires, tarifs, disponibilités) mais ne saurait être tenue responsable des erreurs ou omissions. Les tarifs affichés sont en dollars canadiens, taxes en sus.</p>
        </section>
      </div>
    </div>
  );
}
