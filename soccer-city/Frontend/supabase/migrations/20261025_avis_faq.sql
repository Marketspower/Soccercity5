-- =====================================================================
-- SOCCER CITY — Migration « avis clients + FAQ modifiable »
-- Date : 2026-10-25 — à exécuter APRÈS 20261024_corrections_securite.sql
-- Supabase → SQL Editor → New query → coller → Run. Ré-exécutable.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. AVIS CLIENTS
--    Un avis n'est visible qu'après approbation dans l'admin.
--    Les avis arrivent par /api/reviews (validation + anti-spam).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Colonnes ajoutées (si la table existait déjà sous une autre forme)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reservation_id UUID;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_reviews_approved_date ON public.reviews(approved, created_at DESC);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reviews' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.reviews', pol.policyname);
  END LOOP;
END $$;
-- Table réservée à l'admin (elle contient les courriels).
-- Le public lit les avis approuvés via la vue public_reviews ci-dessous.
CREATE POLICY "reviews_admin" ON public.reviews
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;

-- Vue publique : jamais le courriel du client
DROP VIEW IF EXISTS public.public_reviews;
CREATE VIEW public.public_reviews AS
  SELECT id, author, role, rating, text, verified, created_at
  FROM public.reviews
  WHERE approved = true;
GRANT SELECT ON public.public_reviews TO anon, authenticated;
REVOKE SELECT ON public.reviews FROM anon;

-- Demande d'avis envoyée le lendemain de la réservation
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS review_request_sent_at TIMESTAMPTZ;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS review_token TEXT;
CREATE INDEX IF NOT EXISTS idx_reservations_review_token ON public.reservations(review_token);

-- ---------------------------------------------------------------------
-- 2. FAQ MODIFIABLE DANS L'ADMIN
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'faqs' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.faqs', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "faqs_lecture_publiees" ON public.faqs FOR SELECT USING (published = true);
CREATE POLICY "faqs_admin" ON public.faqs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT ON public.faqs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faqs TO authenticated;

-- Questions de départ (seulement si la FAQ est vide).
-- Publiées : réponses tirées des informations déjà présentes sur le site.
-- NON publiées : vos règles à vous (annulation, remboursement…) — à compléter
-- puis publier depuis Admin → FAQ.
INSERT INTO public.faqs (question, answer, sort_order, published)
SELECT * FROM (VALUES
  ('Quelles sont vos heures d''ouverture ?',
   'Le complexe est ouvert tous les jours, de 8 h à 23 h.', 1, true),
  ('Où se trouve Soccer City ?',
   'Au 835, rue Saint-Jacques, à Saint-Jean-sur-Richelieu (QC J3B 2N2). Le stationnement est gratuit.', 2, true),
  ('Comment réserver un terrain ?',
   'Directement en ligne : choisissez votre terrain, la date et l''horaire, puis payez de façon sécurisée. Vous recevez une confirmation par courriel et par SMS, et un rappel la veille.', 3, true),
  ('Puis-je payer seulement un acompte ?',
   'Oui, pour les réservations admissibles, l''option acompte est proposée au moment du paiement. Le solde se règle sur place, avant l''accès au terrain.', 4, true),
  ('Peut-on organiser un anniversaire ou un événement ?',
   'Oui : un forfait anniversaire clé en main est disponible, ainsi que des formules pour les tournois, entreprises, écoles et événements privés. Consultez la page Événements ou envoyez-nous une demande.', 5, true),
  ('Quelle est votre politique d''annulation ?',
   'À COMPLÉTER : indiquez ici vos conditions d''annulation et de remboursement.', 6, false),
  ('Quel équipement dois-je apporter ?',
   'À COMPLÉTER : chaussures acceptées, protège-tibias, ballons (location sur place)…', 7, false),
  ('Les vestiaires et douches sont-ils inclus ?',
   'À COMPLÉTER : précisez les conditions d''accès aux vestiaires et aux douches.', 8, false)
) AS seed(question, answer, sort_order, published)
WHERE NOT EXISTS (SELECT 1 FROM public.faqs);

SELECT 'Avis et FAQ prêts' AS resultat,
       (SELECT COUNT(*) FROM public.faqs) AS questions_faq,
       (SELECT COUNT(*) FROM public.reviews) AS avis;
