-- =====================================================================
-- SOCCER CITY — Textes légaux dans le CMS (Admin → Pages CMS)
-- Crée ou remplace les pages /confidentialite et /conditions.
-- Ensuite, vous pouvez les modifier directement dans le CMS.
-- Supabase → SQL Editor → coller → Run.
-- =====================================================================
-- Table des pages du CMS (normalement déjà présente)
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pages') THEN
    CREATE POLICY "pages_lecture_publique" ON public.pages FOR SELECT USING (true);
    CREATE POLICY "pages_admin" ON public.pages FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;
GRANT SELECT ON public.pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pages TO authenticated;

DO $do$
DECLARE
  pages_data JSONB := jsonb_build_array(
    jsonb_build_object('slug', 'confidentialite', 'title', 'Politique de confidentialité', 'content', $html$<p>La présente politique explique, en termes simples, quels renseignements personnels <strong>Soccer City</strong> (« nous ») recueille lorsque vous utilisez le site soccercity5.com ou nos services, pourquoi nous les recueillons, avec qui nous les partageons et quels sont vos droits. Elle s'inscrit dans le cadre de la <em>Loi sur la protection des renseignements personnels dans le secteur privé</em> du Québec.</p>

<nav><strong>Sommaire</strong>
<ol>
<li><a href="#responsable">Responsable de la protection des renseignements personnels</a></li>
<li><a href="#collecte">Renseignements que nous recueillons</a></li>
<li><a href="#finalites">Pourquoi nous utilisons vos renseignements</a></li>
<li><a href="#consentement">Votre consentement</a></li>
<li><a href="#partage">Avec qui nous partageons vos renseignements</a></li>
<li><a href="#hors-quebec">Communication à l'extérieur du Québec</a></li>
<li><a href="#temoins">Témoins (cookies) et technologies du site</a></li>
<li><a href="#conservation">Conservation et destruction</a></li>
<li><a href="#securite">Sécurité</a></li>
<li><a href="#droits">Vos droits</a></li>
<li><a href="#modifications">Modifications de la politique</a></li>
</ol></nav>

<h2 id="responsable">1. Responsable de la protection des renseignements personnels</h2>
<p>Pour toute question, demande ou plainte concernant vos renseignements personnels, communiquez avec :</p>
<p><strong>Responsable de la protection des renseignements personnels</strong><br>Soccer City — 835, rue Saint-Jacques, Saint-Jean-sur-Richelieu (QC) J3B 2N2<br>Courriel : <a href="mailto:soccercity5.mtl@gmail.com">soccercity5.mtl@gmail.com</a> · Téléphone : +1 (514) 965-9693</p>

<h2 id="collecte">2. Renseignements que nous recueillons</h2>
<p>Nous recueillons uniquement les renseignements nécessaires au service que vous demandez :</p>
<ul>
<li><strong>Réservation en ligne</strong> (terrain, forfait anniversaire, événement) : nom, courriel, téléphone, terrain, dates et heures choisies, nombre d'invités (facultatif), montants payés et solde à régler.</li>
<li><strong>Inscription à l'académie</strong> : nom, courriel et téléphone de la personne qui inscrit, groupe choisi et paiement.</li>
<li><strong>Demande d'événement</strong> : prénom, nom, entreprise (facultatif), courriel, téléphone, date souhaitée, nombre de personnes et description de votre projet.</li>
<li><strong>Formulaire de contact</strong> : nom, courriel et votre message.</li>
<li><strong>Avis clients</strong> : prénom, note, commentaire et, si vous le fournissez, votre courriel (jamais publié).</li>
<li><strong>Réservation ou paiement à l'accueil</strong> : nom, téléphone, courriel (facultatif), mode de paiement et montant.</li>
<li><strong>Renseignements techniques</strong> : votre adresse IP est utilisée temporairement pour bloquer les envois abusifs (robots, pourriels) et est effacée après 24 heures. Notre hébergeur conserve aussi des journaux techniques de sécurité.</li>
</ul>
<p><strong>Paiements :</strong> les paiements par carte sont traités par Stripe. Votre numéro de carte n'est jamais transmis à nos serveurs ni conservé par Soccer City.</p>

<h2 id="finalites">3. Pourquoi nous utilisons vos renseignements</h2>
<ul>
<li>Traiter et confirmer vos réservations, inscriptions et paiements, et vous rembourser au besoin.</li>
<li>Vous envoyer les messages liés à votre réservation : confirmation, rappel la veille, solde à régler, par courriel et par SMS.</li>
<li>Répondre à vos demandes d'événement et à vos messages.</li>
<li>Vous demander votre avis, une seule fois, le lendemain de votre visite. Vous pouvez répondre à ce courriel pour ne plus recevoir ce type de demande.</li>
<li>Publier votre avis (prénom, note et commentaire) si vous nous l'envoyez, après vérification.</li>
<li>Tenir notre comptabilité et respecter nos obligations légales et fiscales.</li>
<li>Assurer la sécurité du site et prévenir la fraude et les abus.</li>
</ul>

<h2 id="consentement">4. Votre consentement</h2>
<p>Avant tout paiement, vous confirmez avoir lu et accepté la présente politique et nos conditions d'utilisation. En remplissant un formulaire ou en effectuant une réservation, vous consentez à l'utilisation de vos renseignements aux fins décrites ci-dessus. Nous ne les utilisons pas à d'autres fins sans votre consentement, sauf si la loi le permet ou l'exige.</p>
<p>Vous pouvez retirer votre consentement en tout temps en écrivant à <a href="mailto:soccercity5.mtl@gmail.com">soccercity5.mtl@gmail.com</a>. Certains services, comme une réservation déjà payée, pourraient alors ne plus pouvoir être fournis.</p>
<p><strong>Mineurs :</strong> pour une personne de moins de 14 ans, par exemple lors d'une inscription à l'académie, les renseignements sont fournis par le parent ou le tuteur, qui donne son consentement.</p>

<h2 id="partage">5. Avec qui nous partageons vos renseignements</h2>
<p><strong>Nous ne vendons jamais vos renseignements.</strong> Nous les communiquons seulement aux fournisseurs qui nous aident à offrir nos services, et uniquement ce qui leur est nécessaire :</p>
<ul>
<li><strong>Stripe</strong> : traitement des paiements en ligne et des remboursements.</li>
<li><strong>Supabase</strong> : base de données sécurisée et stockage des photos et vidéos du site.</li>
<li><strong>Vercel</strong> : hébergement du site web.</li>
<li><strong>Resend</strong> : envoi des courriels (confirmations, rappels, réponses).</li>
<li><strong>Twilio</strong> : envoi des SMS de confirmation.</li>
</ul>
<p>Nous pouvons aussi communiquer des renseignements lorsque la loi l'exige (par exemple à la demande d'une autorité compétente).</p>

<h2 id="hors-quebec">6. Communication à l'extérieur du Québec</h2>
<p>Les fournisseurs nommés ci-dessus peuvent conserver ou traiter vos renseignements à l'extérieur du Québec, notamment dans d'autres provinces canadiennes ou aux États-Unis. Avant de leur confier des renseignements, nous évaluons s'ils bénéficient d'une protection adéquate, notamment au moyen d'engagements contractuels de confidentialité et de sécurité.</p>

<h2 id="temoins">7. Témoins (cookies) et technologies du site</h2>
<ul>
<li><strong>Fonctionnement du site</strong> : votre navigateur garde en mémoire certaines préférences (par exemple l'affichage) et le contenu public du site (terrains, galerie) pour un chargement plus rapide. Ces éléments ne servent pas à vous identifier.</li>
<li><strong>Espace administrateur</strong> : un témoin de session est utilisé uniquement pour les membres de notre équipe qui se connectent.</li>
<li><strong>Vidéos</strong> : les vidéos YouTube sont affichées en mode « confidentialité renforcée » et ne se chargent que lorsque vous cliquez sur « lecture ».</li>
<li><strong>WhatsApp</strong> : si vous cliquez sur un bouton WhatsApp, la conversation est régie par les conditions et la politique de WhatsApp (Meta).</li>
</ul>
<p><strong>Mesure d'audience et publicité :</strong> si nous utilisons des outils de mesure ou de publicité (par exemple Google Analytics ou le pixel Meta), qui permettent de vous identifier ou de vous profiler, ils restent désactivés par défaut et ne s'activent qu'avec votre consentement, donné dans le bandeau affiché lors de votre première visite. Vous pouvez changer d'avis à tout moment avec le bouton « Modifier mes préférences de mesure » au bas de cette page (affiché lorsque ces outils sont actifs).</p>

<h2 id="conservation">8. Conservation et destruction</h2>
<p>Les renseignements liés aux transactions (réservations, paiements, reçus) sont conservés le temps exigé par les lois fiscales, en général six ans. Les autres renseignements sont conservés tant qu'ils sont nécessaires aux fins pour lesquelles ils ont été recueillis, puis détruits ou anonymisés de façon sécuritaire.</p>
<p>Les adresses IP utilisées contre les abus sont effacées automatiquement après 24 heures.</p>

<h2 id="securite">9. Sécurité</h2>
<ul>
<li>Le site fonctionne entièrement en connexion chiffrée (HTTPS).</li>
<li>L'accès aux renseignements des clients est réservé aux membres autorisés de notre équipe, avec un compte personnel protégé par mot de passe.</li>
<li>Les paiements sont traités par Stripe, certifié selon la norme de sécurité de l'industrie des cartes de paiement (PCI DSS).</li>
<li>En cas d'incident de confidentialité présentant un risque de préjudice sérieux, nous avisons la Commission d'accès à l'information et les personnes concernées, comme la loi l'exige.</li>
</ul>

<h2 id="droits">10. Vos droits</h2>
<p>Vous pouvez en tout temps :</p>
<ul>
<li>savoir si nous détenons des renseignements sur vous et y <strong>accéder</strong>;</li>
<li>les faire <strong>rectifier</strong> s'ils sont inexacts, incomplets ou équivoques;</li>
<li><strong>retirer votre consentement</strong> ou demander la <strong>suppression</strong> de renseignements qui ne sont plus nécessaires;</li>
<li>obtenir les renseignements que vous nous avez fournis dans un <strong>format technologique structuré et couramment utilisé</strong> (portabilité);</li>
<li>demander la <strong>cessation de la diffusion</strong> ou la <strong>désindexation</strong> d'un renseignement vous concernant, dans les conditions prévues par la loi (par exemple, un avis publié).</li>
</ul>
<p>Écrivez à <a href="mailto:soccercity5.mtl@gmail.com">soccercity5.mtl@gmail.com</a>. Nous pourrons vous demander de confirmer votre identité, et nous vous répondrons dans un délai de 30 jours.</p>
<p>Si vous n'êtes pas satisfait de notre réponse, vous pouvez vous adresser à la <a href="https://www.cai.gouv.qc.ca" target="_blank" rel="noopener noreferrer">Commission d'accès à l'information du Québec</a>.</p>

<h2 id="modifications">11. Modifications de la politique</h2>
<p>Nous pouvons modifier cette politique pour refléter l'évolution de nos services ou de la loi. La date de dernière mise à jour figure en haut de la page. Voir aussi nos <a href="/conditions">conditions d'utilisation</a>.</p>$html$),
    jsonb_build_object('slug', 'conditions', 'title', 'Conditions d''utilisation', 'content', $html$<p>Les présentes conditions encadrent l'utilisation du site soccercity5.com et les réservations faites auprès de <strong>Soccer City</strong> (« nous »). En utilisant le site ou en effectuant une réservation, vous acceptez ces conditions. Merci de les lire attentivement.</p>

<nav><strong>Sommaire</strong>
<ol>
<li><a href="#exploitant">Qui sommes-nous</a></li>
<li><a href="#reservations">Réservations en ligne</a></li>
<li><a href="#prix">Prix et paiement</a></li>
<li><a href="#annulation">Annulation et modification</a></li>
<li><a href="#evenements">Forfaits et événements</a></li>
<li><a href="#academie">Académie</a></li>
<li><a href="#regles">Règles sur place</a></li>
<li><a href="#responsabilite">Santé, sécurité et responsabilité</a></li>
<li><a href="#avis">Avis publiés sur le site</a></li>
<li><a href="#site">Utilisation du site</a></li>
<li><a href="#renseignements">Renseignements personnels</a></li>
<li><a href="#modifications">Modifications</a></li>
<li><a href="#droit">Droit applicable</a></li>
</ol></nav>

<h2 id="exploitant">1. Qui sommes-nous</h2>
<p>Soccer City — 835, rue Saint-Jacques, Saint-Jean-sur-Richelieu (QC) J3B 2N2<br>Téléphone : +1 (514) 965-9693 · Courriel : <a href="mailto:soccercity5.mtl@gmail.com">soccercity5.mtl@gmail.com</a></p>

<h2 id="reservations">2. Réservations en ligne</h2>
<ul>
<li>Les créneaux proposés en ligne sont ceux disponibles au moment de votre recherche. <strong>Une réservation n'est confirmée qu'une fois le paiement accepté</strong> ; vous recevez alors une confirmation par courriel et par SMS.</li>
<li>Si un même créneau est payé par une autre personne quelques instants avant vous, votre paiement vous est <strong>remboursé intégralement et automatiquement</strong>, et vous en êtes avisé.</li>
<li>Vous êtes responsable de l'exactitude des renseignements fournis (nom, courriel, téléphone), qui servent à vous envoyer votre confirmation et vos rappels.</li>
<li>La location donne accès au terrain réservé, ou à l'ensemble du complexe pour un événement privé, uniquement pendant la plage horaire réservée. Merci de libérer le terrain à l'heure de fin prévue.</li>
</ul>

<h2 id="prix">3. Prix et paiement</h2>
<ul>
<li>Les prix sont affichés en dollars canadiens, avant taxes ; la TPS et la TVQ sont ajoutées et détaillées avant le paiement.</li>
<li>Le paiement en ligne se fait par carte, de façon sécurisée, par l'intermédiaire de Stripe.</li>
<li>Avant de payer, vous confirmez avoir lu et accepté les présentes conditions et notre politique de confidentialité.</li>
<li>Lorsque l'option est proposée, vous pouvez payer un <strong>acompte</strong> en ligne. Le <strong>solde doit être réglé sur place, avant l'accès au terrain</strong> (carte, comptant ou virement).</li>
<li>Les prix affichés au moment de la réservation sont ceux qui s'appliquent à votre réservation.</li>
</ul>

<h2 id="annulation">4. Annulation et modification</h2>
<p>Pour annuler ou modifier une réservation, contactez-nous le plus tôt possible à <a href="mailto:soccercity5.mtl@gmail.com">soccercity5.mtl@gmail.com</a> ou au +1 (514) 965-9693, en indiquant le nom et la date de la réservation. Lorsqu'un remboursement est accordé, il est fait sur la carte utilisée pour le paiement.</p>

<h2 id="evenements">5. Forfaits et événements</h2>
<ul>
<li><strong>Forfait anniversaire</strong> : durée fixe de 2 h 30, selon le déroulement décrit sur la page du forfait.</li>
<li><strong>Événements réservés en ligne</strong> : le prix est calculé à l'heure, pour chaque jour réservé ; l'événement privatise le complexe pendant la plage horaire choisie.</li>
<li><strong>Demandes d'événement sur mesure</strong> : après étude de votre demande, nous vous envoyons une proposition (prix et horaire) avec un lien de paiement. <strong>La date n'est réservée qu'une fois le paiement reçu</strong> ; d'ici là, le créneau peut être réservé par quelqu'un d'autre. Une demande sans réponse ou une proposition non payée peut expirer.</li>
</ul>

<h2 id="academie">6. Académie</h2>
<ul>
<li>L'inscription couvre une session de 10 semaines, pour le groupe et l'horaire choisis. Les places sont limitées et attribuées dans l'ordre des paiements.</li>
<li>L'inscription d'un mineur est faite par son parent ou son tuteur, qui accepte les présentes conditions en son nom.</li>
</ul>

<h2 id="regles">7. Règles sur place</h2>
<ul>
<li>Respectez les consignes du personnel et les règles affichées dans le complexe.</li>
<li>Les enfants doivent être accompagnés et supervisés par un adulte responsable, sauf pendant les activités encadrées par notre équipe.</li>
<li>Tout comportement violent, dangereux ou irrespectueux, ou toute consommation interdite, peut entraîner l'expulsion, sans remboursement.</li>
<li>Le client est responsable des dommages causés intentionnellement ou par négligence aux installations et à l'équipement.</li>
</ul>

<h2 id="responsabilite">8. Santé, sécurité et responsabilité</h2>
<p>Le soccer est une activité physique qui comporte des risques normaux de blessure. Chaque participant s'assure d'être apte à pratiquer l'activité et utilise un équipement approprié.</p>
<p>Soccer City n'est pas responsable de la perte ou du vol d'objets personnels laissés sur place, sauf en cas de faute de sa part. Rien dans les présentes conditions ne limite notre responsabilité lorsque la loi l'interdit, notamment pour un préjudice corporel ou moral causé par notre faute.</p>

<h2 id="avis">9. Avis publiés sur le site</h2>
<ul>
<li>Les avis sont publiés après vérification par notre équipe. Nous publions votre prénom, votre note et votre commentaire, jamais votre courriel.</li>
<li>Nous refusons les avis injurieux, discriminatoires, publicitaires, sans lien avec nos services ou contenant des renseignements personnels sur d'autres personnes.</li>
<li>Nous ne modifions pas le contenu des avis. Vous pouvez demander le retrait de votre avis en tout temps à <a href="mailto:soccercity5.mtl@gmail.com">soccercity5.mtl@gmail.com</a>.</li>
</ul>

<h2 id="site">10. Utilisation du site</h2>
<ul>
<li>Il est interdit d'utiliser le site de façon abusive : envois automatisés, tentative d'accès non autorisé, fausses réservations ou fausses demandes.</li>
<li>Le contenu du site (logo, textes, photos, vidéos, mise en page) appartient à Soccer City ou à ses partenaires et ne peut être reproduit sans autorisation.</li>
<li>Les liens vers des sites tiers (Google, WhatsApp, Stripe…) sont fournis pour votre commodité ; ces sites ont leurs propres conditions.</li>
<li>Nous faisons notre possible pour que le site soit accessible et exact, sans pouvoir garantir l'absence totale d'interruption ou d'erreur.</li>
</ul>

<h2 id="renseignements">11. Renseignements personnels</h2>
<p>L'utilisation de vos renseignements personnels est décrite dans notre <a href="/confidentialite">politique de confidentialité</a>.</p>

<h2 id="modifications">12. Modifications</h2>
<p>Nous pouvons modifier ces conditions. La version applicable à votre réservation est celle en vigueur au moment où vous l'effectuez. La date de dernière mise à jour figure en haut de la page.</p>

<h2 id="droit">13. Droit applicable</h2>
<p>Ces conditions sont régies par les lois du Québec et les lois du Canada qui s'y appliquent. Tout litige relève des tribunaux du district judiciaire d'Iberville, sous réserve des droits que la loi accorde au consommateur, notamment la <em>Loi sur la protection du consommateur</em>.</p>$html$)
  );
  p JSONB;
BEGIN
  FOR p IN SELECT * FROM jsonb_array_elements(pages_data) LOOP
    UPDATE public.pages
      SET title = p->>'title', content = p->>'content', updated_at = NOW()
      WHERE slug = p->>'slug';
    IF NOT FOUND THEN
      INSERT INTO public.pages (slug, title, content) VALUES (p->>'slug', p->>'title', p->>'content');
    END IF;
  END LOOP;
END $do$;

SELECT slug, title, length(content) AS caracteres, updated_at FROM public.pages
WHERE slug IN ('confidentialite', 'conditions');
