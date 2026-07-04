import type { Metadata } from "next";
import { CONTACT } from "@/lib/data";

export const metadata: Metadata = { 
  title: "Politique de confidentialité" 
};

export default function Confidentialite() {
  return (
    <div className="container max-w-3xl pt-32 pb-24">
      <p className="speed-eyebrow mb-4">Vos données</p>
      <h1 className="text-4xl font-bold mb-10">Politique de confidentialité</h1>
      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-bold text-foreground mb-2">Données collectées</h2>
          <p>Lors d&apos;une réservation ou d&apos;une demande d&apos;événement, nous collectons uniquement les informations nécessaires : nom, prénom, courriel, numéro de téléphone, et le détail de votre demande.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-foreground mb-2">Finalités</h2>
          <p>Ces données servent exclusivement à gérer votre réservation, vous contacter au sujet de votre événement et, avec votre consentement, vous envoyer notre infolettre.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-foreground mb-2">Vos droits</h2>
          <p>Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données à tout moment en écrivant à {CONTACT.email}.</p>
        </section>
      </div>
    </div>
  );
}