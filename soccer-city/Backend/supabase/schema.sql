-- ============================================
-- SOCCER CITY - Schéma complet Supabase
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist; -- nécessaire pour l'EXCLUDE constraint anti-chevauchement

-- ============================================
-- 1. TABLE USERS
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. TABLE FIELDS (terrains) — ajoutée, manquait du schéma original
-- ============================================
CREATE TABLE IF NOT EXISTS public.fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    image_url TEXT,
    dimensions TEXT NOT NULL DEFAULT '40 × 20 m',
    turf TEXT NOT NULL DEFAULT 'Gazon synthétique 5G'
        CHECK (turf IN ('Gazon synthétique 5G', 'Gazon synthétique hybride', 'Gazon naturel')),
    lighting BOOLEAN NOT NULL DEFAULT true,
    locker_rooms INT NOT NULL DEFAULT 2,
    parking BOOLEAN NOT NULL DEFAULT true,
    players TEXT NOT NULL DEFAULT '5 vs 5',
    price_per_hour DECIMAL(8,2) NOT NULL DEFAULT 90,
    indoor BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fields_active ON public.fields(active);

-- ============================================
-- 3. TABLE RESERVATIONS
-- start_time/end_time en TEXT ("HH:MM") pour matcher le front, + end_date
-- ============================================
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    field_id UUID REFERENCES public.fields(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_phone TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_date DATE NOT NULL,
    end_time TEXT NOT NULL,
    price DECIMAL(8,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT reservations_end_after_start CHECK (
        end_date > date OR (end_date = date AND end_time > start_time)
    ),

    -- Empêche tout chevauchement en base (même en cas de requêtes concurrentes),
    -- en plus de la vérification déjà faite côté app dans lib/api.ts
    booked_range tsrange GENERATED ALWAYS AS (
        tsrange(
            (date::text || ' ' || start_time)::timestamp,
            (end_date::text || ' ' || end_time)::timestamp,
            '[)'
        )
    ) STORED
);

ALTER TABLE public.reservations
    ADD CONSTRAINT reservations_no_overlap
    EXCLUDE USING gist (
        field_id WITH =,
        booked_range WITH &&
    ) WHERE (status <> 'cancelled');

CREATE INDEX idx_reservations_user ON public.reservations(user_id);
CREATE INDEX idx_reservations_field ON public.reservations(field_id);
CREATE INDEX idx_reservations_status ON public.reservations(status);
CREATE INDEX idx_reservations_date ON public.reservations(date);
CREATE INDEX idx_reservations_end_date ON public.reservations(end_date);

-- ============================================
-- 4. TABLE PRIVATE_EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.private_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    company TEXT,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    date DATE NOT NULL,
    guests INT NOT NULL CHECK (guests BETWEEN 1 AND 500),
    type TEXT NOT NULL CHECK (type IN ('Anniversaire', 'Tournoi', 'Entreprise', 'École', 'Événement privé', 'Compétition')),
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'accepted', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_status ON public.private_events(status);
CREATE INDEX idx_events_date ON public.private_events(date);

-- ============================================
-- 5. TABLE AVAILABILITY (blocages admin)
-- start_time/end_time en TEXT pour matcher le front
-- ============================================
CREATE TABLE IF NOT EXISTS public.availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID REFERENCES public.fields(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    blocked BOOLEAN NOT NULL DEFAULT true,
    reason TEXT,
    CONSTRAINT availability_end_after_start CHECK (end_time > start_time)
);

CREATE INDEX idx_availability_date ON public.availability(date);
CREATE INDEX idx_availability_field ON public.availability(field_id);

-- ============================================
-- 6. TABLE PRICING (plans affichés publiquement)
-- ============================================
CREATE TABLE IF NOT EXISTS public.pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price DECIMAL(8,2) NOT NULL,
    unit TEXT NOT NULL,
    features JSONB NOT NULL DEFAULT '[]',
    highlighted BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 7. TABLE REVIEWS (avis)
-- ============================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    author TEXT NOT NULL,
    role TEXT,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text TEXT NOT NULL,
    avatar TEXT,
    approved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_approved ON public.reviews(approved);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);

-- ============================================
-- 8. TABLE GALLERY
-- ============================================
CREATE TABLE IF NOT EXISTS public.gallery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_url TEXT NOT NULL,
    alt TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    event_id UUID REFERENCES public.private_events(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gallery_event ON public.gallery(event_id);

-- ============================================
-- 9. TABLE MEDIA
-- ============================================
CREATE TABLE IF NOT EXISTS public.media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('video', 'photo', 'audio')),
    thumbnail TEXT,
    duration TEXT,
    description TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    event_id UUID REFERENCES public.private_events(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_event ON public.media(event_id);
CREATE INDEX idx_media_featured ON public.media(is_featured);

-- ============================================
-- 10. TABLE SETTINGS (legacy, laissée pour compatibilité)
-- ============================================
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 11. TABLE NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'clients', 'admins')),
    sent_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 12. TABLE STATS
-- ============================================
CREATE TABLE IF NOT EXISTS public.stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value INTEGER NOT NULL DEFAULT 0,
    label TEXT NOT NULL,
    suffix TEXT DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 13. TABLE RATINGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 14. TABLE PAGES (CMS)
-- ============================================
CREATE TABLE IF NOT EXISTS public.pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- DONNÉES INITIALES
-- ============================================

INSERT INTO public.stats (key, value, label, suffix) VALUES
('matchs_joues', 12500, 'Matchs joués', '+'),
('satisfaction', 98, 'Satisfaction', '%'),
('annees_experience', 8, 'Années d''expérience', '+'),
('terrains', 2, 'Terrains', '')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.pricing (name, price, unit, features, highlighted, sort_order) VALUES
('À l''heure', 90, '/ heure', '["Bloc d''1 heure garanti", "Vestiaires + douches inclus", "Éclairage LED compris", "Annulation gratuite 24 h avant"]', false, 1),
('Journée', 650, '/ jour', '["Terrain privatisé 8 h – 23 h", "Coordinateur sur place", "Sonorisation incluse", "10 ballons de match fournis"]', true, 2),
('Tournoi', 1200, '/ événement', '["2 terrains + zone d''accueil", "Arbitres officiels", "Tableau des scores sur écran géant", "Podium et remise des trophées"]', false, 3),
('Entreprise', 1800, '/ événement', '["Complexe entier privatisé", "Traiteur & cafétéria dédiée", "Animation team-building", "Captation vidéo du match"]', false, 4);

INSERT INTO public.settings (key, value) VALUES
('open_hour', '8'),
('close_hour', '23'),
('contact', '{"phone":"+1 (450) 555-0192","email":"info@soccercity.ca"}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.pages (slug, title, content) VALUES
('confidentialite', 'Politique de confidentialité', '<h2>Données collectées</h2><p>Lors d''une réservation ou d''une demande d''événement, nous collectons uniquement les informations nécessaires : nom, prénom, courriel, numéro de téléphone.</p><h2>Finalités</h2><p>Ces données servent exclusivement à gérer votre réservation.</p>'),
('conditions', 'Conditions d''utilisation', '<h2>Acceptation des conditions</h2><p>En utilisant ce site, vous acceptez les présentes conditions.</p><h2>Responsabilité</h2><p>Soccer City ne saurait être tenu responsable des erreurs ou omissions.</p>')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- FONCTIONS ET TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_satisfaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.stats
    SET value = (SELECT ROUND(AVG(rating) * 10) / 10 FROM public.ratings WHERE rating IS NOT NULL)
    WHERE key = 'satisfaction';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_satisfaction_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.ratings
EXECUTE FUNCTION update_satisfaction();

CREATE OR REPLACE FUNCTION increment_matchs_joues()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.stats SET value = value + 1 WHERE key = 'matchs_joues';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_matchs_trigger
AFTER INSERT ON public.reservations
FOR EACH ROW
WHEN (NEW.status = 'confirmed')
EXECUTE FUNCTION increment_matchs_joues();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique des terrains" ON public.fields FOR SELECT USING (true);
CREATE POLICY "Lecture publique des tarifs" ON public.pricing FOR SELECT USING (true);
CREATE POLICY "Lecture publique de la galerie" ON public.gallery FOR SELECT USING (true);
CREATE POLICY "Lecture publique des médias" ON public.media FOR SELECT USING (true);
CREATE POLICY "Lecture publique des avis approuvés" ON public.reviews FOR SELECT USING (approved = true);
CREATE POLICY "Lecture publique des paramètres" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Lecture publique des disponibilités" ON public.availability FOR SELECT USING (true);
CREATE POLICY "Lecture publique des statistiques" ON public.stats FOR SELECT USING (true);
CREATE POLICY "Lecture publique des évaluations" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Lecture publique des pages" ON public.pages FOR SELECT USING (true);
-- Les réservations existantes doivent être visibles publiquement pour le check de chevauchement côté client
CREATE POLICY "Lecture publique des réservations actives" ON public.reservations
    FOR SELECT USING (status <> 'cancelled');

CREATE POLICY "Création publique des réservations" ON public.reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Création publique des événements" ON public.private_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Création publique des avis" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Création publique des évaluations" ON public.ratings FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin gestion des terrains" ON public.fields FOR ALL USING (public.is_admin());
CREATE POLICY "Admin gestion des tarifs" ON public.pricing FOR ALL USING (public.is_admin());
CREATE POLICY "Admin gestion des statistiques" ON public.stats FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin gestion des utilisateurs" ON public.users FOR ALL USING (public.is_admin() OR id = auth.uid());
CREATE POLICY "Admin gestion des pages" ON public.pages FOR ALL USING (public.is_admin());
CREATE POLICY "Admin gestion de la galerie" ON public.gallery FOR ALL USING (public.is_admin());
CREATE POLICY "Admin gestion des médias" ON public.media FOR ALL USING (public.is_admin());
CREATE POLICY "Admin gestion des réservations" ON public.reservations FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin suppression des réservations" ON public.reservations FOR DELETE USING (public.is_admin());
CREATE POLICY "Admin gestion des disponibilités" ON public.availability FOR ALL USING (public.is_admin());
CREATE POLICY "Admin gestion des événements" ON public.private_events FOR ALL USING (public.is_admin());
CREATE POLICY "Admin gestion des notifications" ON public.notifications FOR ALL USING (public.is_admin());

-- ============================================
-- STORAGE
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true), ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Lecture publique des images" ON storage.objects FOR SELECT USING (bucket_id = 'images' OR bucket_id = 'media');
CREATE POLICY "Upload authentifié des images" ON storage.objects FOR INSERT WITH CHECK ((bucket_id = 'images' OR bucket_id = 'media') AND auth.role() = 'authenticated');
CREATE POLICY "Modification authentifiée des images" ON storage.objects FOR UPDATE USING ((bucket_id = 'images' OR bucket_id = 'media') AND auth.role() = 'authenticated');
CREATE POLICY "Suppression authentifiée des images" ON storage.objects FOR DELETE USING ((bucket_id = 'images' OR bucket_id = 'media') AND auth.role() = 'authenticated');