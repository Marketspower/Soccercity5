-- =====================================================================
-- SOCCER CITY — Migration « corrections sécurité + automatisations »
-- Date : 2026-10-24
--
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run.
-- Le script est ré-exécutable sans danger (idempotent).
--
-- Ce qu'il fait :
--   1. Ferme les failles d'accès (RLS) : plus d'auto-promotion admin,
--      plus de réservation gratuite directe, plus de lecture publique
--      des coordonnées clients.
--   2. Empêche en base toute double réservation (y compris événements
--      et anniversaires qui privatisent le complexe).
--   3. Ajoute les colonnes nécessaires au nouveau flux « Accepter →
--      lien de paiement », aux remboursements et aux médias par type
--      d'événement.
--   4. Ajoute une limite anti-spam (formulaires, notes, paiements).
--   5. Corrige la statistique « Satisfaction % ».
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Fonction is_admin() durcie (search_path fixé)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Petite aide : supprime TOUTES les politiques RLS d'une table
-- (les noms réels en base peuvent différer de schema.sql).
CREATE OR REPLACE FUNCTION pg_temp.drop_all_policies(p_table TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = p_table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, p_table);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 1. COLONNES AJOUTÉES (si absentes)
-- ---------------------------------------------------------------------

-- Demandes d'événement : flux Accepter / Refuser / Payer
ALTER TABLE public.private_events ADD COLUMN IF NOT EXISTS quoted_price NUMERIC(10,2);
ALTER TABLE public.private_events ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE public.private_events ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE public.private_events ADD COLUMN IF NOT EXISTS payment_token TEXT;
ALTER TABLE public.private_events ADD COLUMN IF NOT EXISTS admin_message TEXT;
ALTER TABLE public.private_events ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE public.private_events ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;
ALTER TABLE public.private_events ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.private_events ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE public.private_events ADD COLUMN IF NOT EXISTS payment_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE public.private_events ADD COLUMN IF NOT EXISTS expires_at DATE;

-- Statuts autorisés : new, accepted, declined, expired, paid
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.private_events'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.private_events DROP CONSTRAINT %I', c.conname);
  END LOOP;
  ALTER TABLE public.private_events
    ADD CONSTRAINT private_events_status_check
    CHECK (status IN ('new', 'accepted', 'declined', 'expired', 'paid'));
END $$;

-- Réservations : lien vers la session Stripe (remboursements)
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
-- Case « forcer » de l'accueil : l'admin accepte sciemment un chevauchement
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS allow_overlap BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_reservations_stripe_session ON public.reservations(stripe_session_id);

-- Paiements : verrou d'idempotence + suivi des remboursements
DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
    ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS notes TEXT;

    -- Statuts autorisés élargis (pending = traitement en cours)
    DECLARE c RECORD;
    BEGIN
      FOR c IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.payments'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%status%'
      LOOP
        EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT %I', c.conname);
      END LOOP;
    END;
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_status_check
      CHECK (status IN ('pending', 'paid', 'refunded', 'partially_refunded', 'failed'));

    -- Une session Stripe = un seul paiement (anti-doublon).
    -- INDISPENSABLE : sans cet index, un webhook reçu deux fois pourrait
    -- rembourser un paiement valide. Le script s'arrête s'il y a des doublons.
    BEGIN
      CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_session_unique
        ON public.payments(stripe_session_id)
        WHERE stripe_session_id IS NOT NULL;
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION E'⛔ Doublons dans payments.stripe_session_id. Repérez-les avec :\n  SELECT stripe_session_id, count(*) FROM payments GROUP BY 1 HAVING count(*) > 1;\nSupprimez les lignes en trop (gardez-en une par session), puis relancez ce script.';
    END;
    CREATE INDEX IF NOT EXISTS idx_payments_intent ON public.payments(stripe_payment_intent_id);
  ELSE
    RAISE NOTICE '⚠️ Table payments absente : créez-la avant de mettre le site en ligne.';
  END IF;
END $$;

-- Académie : lien Stripe + statut annulé possible
DO $$
DECLARE c RECORD;
BEGIN
  IF to_regclass('public.academy_enrollments') IS NOT NULL THEN
    ALTER TABLE public.academy_enrollments ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
    FOR c IN
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'public.academy_enrollments'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%status%'
    LOOP
      EXECUTE format('ALTER TABLE public.academy_enrollments DROP CONSTRAINT %I', c.conname);
    END LOOP;
    ALTER TABLE public.academy_enrollments
      ADD CONSTRAINT academy_enrollments_status_check
      CHECK (status IN ('pending', 'confirmed', 'cancelled'));
  END IF;
END $$;

-- Médias par TYPE d'événement (et non plus par demande client)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['gallery', 'media'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Table % absente : ignorée', t;
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS event_type TEXT', t);
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, t || '_event_type_check');
    EXECUTE format($f$ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (event_type IS NULL OR event_type IN
      ('Anniversaire', 'Tournoi', 'Entreprise', 'École', 'Événement privé', 'Compétition', 'Académie'))$f$,
      t, t || '_event_type_check');
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(event_type)', 'idx_' || t || '_event_type', t);
    -- Reprise des anciens liens (photo liée à une demande → type de la demande)
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = t AND column_name = 'event_id') THEN
      EXECUTE format('UPDATE public.%I x SET event_type = pe.type FROM public.private_events pe
                      WHERE x.event_id = pe.id AND x.event_type IS NULL', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 2. ANTI-DOUBLE-RÉSERVATION EN BASE
--    field_id NULL = complexe privatisé (événement, anniversaire, accueil)
--    → entre en conflit avec TOUT créneau qui chevauche.
--    Verrou transactionnel : deux paiements simultanés ne peuvent plus
--    réserver le même créneau.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reservations_prevent_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_range TSRANGE;
  clash_id UUID;
BEGIN
  IF NEW.status = 'cancelled' OR NEW.allow_overlap THEN
    RETURN NEW;
  END IF;

  -- Mise à jour sans changement d'horaire/terrain/statut : rien à vérifier
  IF TG_OP = 'UPDATE'
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.date = OLD.date
     AND NEW.end_date IS NOT DISTINCT FROM OLD.end_date
     AND NEW.start_time::text = OLD.start_time::text
     AND NEW.end_time::text = OLD.end_time::text
     AND NEW.field_id IS NOT DISTINCT FROM OLD.field_id THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('public.reservations.no_overlap'));

  new_range := tsrange(
    (NEW.date::text || ' ' || NEW.start_time::text)::timestamp,
    (COALESCE(NEW.end_date, NEW.date)::text || ' ' || NEW.end_time::text)::timestamp,
    '[)'
  );

  SELECT r.id INTO clash_id
  FROM public.reservations r
  WHERE r.id <> NEW.id
    AND r.status <> 'cancelled'
    AND (NEW.field_id IS NULL OR r.field_id IS NULL OR r.field_id = NEW.field_id)
    AND r.date <= COALESCE(NEW.end_date, NEW.date)
    AND COALESCE(r.end_date, r.date) >= NEW.date
    AND tsrange(
          (r.date::text || ' ' || r.start_time::text)::timestamp,
          (COALESCE(r.end_date, r.date)::text || ' ' || r.end_time::text)::timestamp,
          '[)'
        ) && new_range
  LIMIT 1;

  IF clash_id IS NOT NULL THEN
    RAISE EXCEPTION 'Créneau déjà réservé (conflit avec la réservation %)', clash_id
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS reservations_prevent_overlap ON public.reservations;
CREATE TRIGGER reservations_prevent_overlap
BEFORE INSERT OR UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.reservations_prevent_overlap();

-- ---------------------------------------------------------------------
-- 3. VUE PUBLIQUE DES CRÉNEAUX OCCUPÉS (aucune donnée client)
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS public.busy_slots;
CREATE VIEW public.busy_slots AS
  SELECT field_id, date, end_date, start_time::text AS start_time, end_time::text AS end_time
  FROM public.reservations
  WHERE status <> 'cancelled';
GRANT SELECT ON public.busy_slots TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. LIMITE ANTI-SPAM (utilisée par les routes API serveur)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_time ON public.rate_limits(key, created_at);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;  -- aucune politique : serveur seulement

CREATE OR REPLACE FUNCTION public.hit_rate_limit(p_key TEXT, p_max INT, p_window_seconds INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n INT;
BEGIN
  DELETE FROM public.rate_limits
  WHERE created_at < NOW() - INTERVAL '1 day';

  SELECT COUNT(*) INTO n FROM public.rate_limits
  WHERE key = p_key AND created_at > NOW() - make_interval(secs => p_window_seconds);

  IF n >= p_max THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.rate_limits(key) VALUES (p_key);
  RETURN TRUE;
END $$;
REVOKE ALL ON FUNCTION public.hit_rate_limit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. STATISTIQUES : satisfaction en % (moyenne /5 × 100)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_satisfaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.stats') IS NULL OR to_regclass('public.ratings') IS NULL THEN
    RETURN NULL;
  END IF;
  UPDATE public.stats
  SET value = COALESCE((SELECT ROUND(AVG(rating) * 20) FROM public.ratings), value)
  WHERE key = 'satisfaction';
  RETURN NULL;
END $$;

-- Statistiques de la page d'accueil : chaque chiffre est calculé seulement
-- si sa table existe (votre base ne contient pas forcément stats / ratings).
DROP FUNCTION IF EXISTS public.get_homepage_stats();
CREATE FUNCTION public.get_homepage_stats()
RETURNS TABLE (fields_count INT, reservations_count INT, satisfaction_percent INT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE f INT := 0; r INT := 0; sat INT := NULL;
BEGIN
  IF to_regclass('public.fields') IS NOT NULL THEN
    BEGIN
      EXECUTE 'SELECT COUNT(*)::int FROM public.fields WHERE active' INTO f;
    EXCEPTION WHEN undefined_column THEN
      EXECUTE 'SELECT COUNT(*)::int FROM public.fields' INTO f;
    END;
  END IF;
  EXECUTE 'SELECT COUNT(*)::int FROM public.reservations WHERE status = ''confirmed''' INTO r;
  IF to_regclass('public.ratings') IS NOT NULL THEN
    EXECUTE 'SELECT ROUND(AVG(rating) * 20)::int FROM public.ratings' INTO sat;
  END IF;
  IF sat IS NULL AND to_regclass('public.stats') IS NOT NULL THEN
    EXECUTE 'SELECT value::int FROM public.stats WHERE key = ''satisfaction''' INTO sat;
  END IF;
  RETURN QUERY SELECT f, r, COALESCE(sat, 0);
END $$;
GRANT EXECUTE ON FUNCTION public.get_homepage_stats() TO anon, authenticated;

-- Notes : commentaire limité (si la table existe)
DO $$
BEGIN
  IF to_regclass('public.ratings') IS NOT NULL THEN
    ALTER TABLE public.ratings DROP CONSTRAINT IF EXISTS ratings_comment_length;
    ALTER TABLE public.ratings ADD CONSTRAINT ratings_comment_length
      CHECK (comment IS NULL OR char_length(comment) <= 1000);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 6. RLS — RÉÉCRITURE COMPLÈTE DES POLITIQUES
--    Règle : le public LIT le catalogue ; seul l'admin ÉCRIT.
--    Les formulaires publics passent par les routes API serveur
--    (clé service_role, validation + anti-spam).
-- ---------------------------------------------------------------------

-- users : on lit sa propre ligne ; seul un admin modifie (fin de l'auto-promotion)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN PERFORM pg_temp.drop_all_policies('users'); END $$;
CREATE POLICY "users_lecture_soi_ou_admin" ON public.users
  FOR SELECT USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "users_admin_ecriture" ON public.users
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- reservations : admin uniquement (le public passe par busy_slots / Stripe)
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN PERFORM pg_temp.drop_all_policies('reservations'); END $$;
CREATE POLICY "reservations_admin" ON public.reservations
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- private_events : admin uniquement (création via /api/event-request)
ALTER TABLE public.private_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN PERFORM pg_temp.drop_all_policies('private_events'); END $$;
CREATE POLICY "private_events_admin" ON public.private_events
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ratings : lecture publique ; création via /api/rating (anti-spam)
DO $$
BEGIN
  IF to_regclass('public.ratings') IS NOT NULL THEN
    ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
    PERFORM pg_temp.drop_all_policies('ratings');
    CREATE POLICY "ratings_lecture_publique" ON public.ratings FOR SELECT USING (true);
    CREATE POLICY "ratings_admin" ON public.ratings
      FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

-- Tables « catalogue » : lecture publique, écriture admin
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fields', 'pricing', 'gallery', 'media', 'settings', 'availability',
    'stats', 'pages', 'field_media'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      PERFORM pg_temp.drop_all_policies(t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true)', t || '_lecture_publique', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())', t || '_admin', t);
    END IF;
  END LOOP;
END $$;

-- reviews : lecture des avis approuvés ; un visiteur ne peut PAS s'auto-approuver
DO $$
BEGIN
  IF to_regclass('public.reviews') IS NOT NULL THEN
    ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
    PERFORM pg_temp.drop_all_policies('reviews');
    CREATE POLICY "reviews_lecture_approuves" ON public.reviews FOR SELECT USING (approved = true);
    CREATE POLICY "reviews_creation_non_approuvee" ON public.reviews FOR INSERT WITH CHECK (approved = false);
    CREATE POLICY "reviews_admin" ON public.reviews
      FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

-- Données sensibles : admin uniquement
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['payments', 'academy_enrollments', 'notifications']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      PERFORM pg_temp.drop_all_policies(t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())', t || '_admin', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 7. STORAGE : lecture publique, envoi/modification/suppression ADMIN
-- ---------------------------------------------------------------------
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (coalesce(qual, '') ILIKE '%images%' OR coalesce(qual, '') ILIKE '%media%'
           OR coalesce(with_check, '') ILIKE '%images%' OR coalesce(with_check, '') ILIKE '%media%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "sc_storage_lecture_publique" ON storage.objects
  FOR SELECT USING (bucket_id IN ('images', 'media'));
CREATE POLICY "sc_storage_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id IN ('images', 'media') AND public.is_admin());
CREATE POLICY "sc_storage_admin_update" ON storage.objects
  FOR UPDATE USING (bucket_id IN ('images', 'media') AND public.is_admin());
CREATE POLICY "sc_storage_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id IN ('images', 'media') AND public.is_admin());

-- ---------------------------------------------------------------------
-- 8. Nettoyage des données factices
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.settings') IS NOT NULL THEN
    UPDATE public.settings
    SET value = '{"phone":"+1 (514) 965-9693","email":"soccercity5.mtl@gmail.com"}'::jsonb
    WHERE key = 'contact' AND value::text ILIKE '%555-0192%';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Réglage contact non modifié : %', SQLERRM;
END $$;

DO $$
BEGIN
  UPDATE public.users SET phone = NULL WHERE phone = '+1 (450) 555-0192';
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- ---------------------------------------------------------------------
-- VÉRIFICATION : liste des admins (doit contenir UNIQUEMENT vos comptes)
-- ---------------------------------------------------------------------
SELECT * FROM public.users WHERE role = 'admin';
