-- ============================================
-- SOCCER CITY - Schéma complet Supabase
-- ============================================

-- Activer UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
-- 2. TABLE FIELDS (Terrains)
-- ============================================
CREATE TABLE IF NOT EXISTS public.fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    image_url TEXT,
    dimensions TEXT NOT NULL,
    turf TEXT NOT NULL,
    lighting BOOLEAN NOT NULL DEFAULT true,
    locker_rooms INT NOT NULL DEFAULT 2,
    parking BOOLEAN NOT NULL DEFAULT true,
    players TEXT NOT NULL,
    price_per_hour DECIMAL(8,2) NOT NULL,
    indoor BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. TABLE RESERVATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID NOT NULL REFERENCES public.fields(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_phone TEXT NOT NULL,
    date DATE NOT NULL,
    hour INT NOT NULL CHECK (hour BETWEEN 8 AND 22),
    price DECIMAL(8,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_slot UNIQUE (field_id, date, hour)
);

CREATE INDEX idx_reservations_field_date ON public.reservations(field_id, date);
CREATE INDEX idx_reservations_user ON public.reservations(user_id);
CREATE INDEX idx_reservations_status ON public.reservations(status);
CREATE INDEX idx_reservations_date ON public.reservations(date);

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
-- 5. TABLE AVAILABILITY (Disponibilités)
-- ============================================
CREATE TABLE IF NOT EXISTS public.availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID NOT NULL REFERENCES public.fields(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    hour INT NOT NULL CHECK (hour BETWEEN 8 AND 22),
    blocked BOOLEAN NOT NULL DEFAULT true,
    reason TEXT,
    CONSTRAINT unique_block UNIQUE (field_id, date, hour)
);

CREATE INDEX idx_availability_field_date ON public.availability(field_id, date);

-- ============================================
-- 6. TABLE PRICING (Tarifs)
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
-- 7. TABLE REVIEWS (Avis)
-- ============================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    field_id UUID REFERENCES public.fields(id) ON DELETE SET NULL,
    author TEXT NOT NULL,
    role TEXT,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text TEXT NOT NULL,
    approved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_approved ON public.reviews(approved);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);

-- ============================================
-- 8. TABLE GALLERY (Galerie)
-- ============================================
CREATE TABLE IF NOT EXISTS public.gallery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_url TEXT NOT NULL,
    alt TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 9. TABLE SETTINGS (Paramètres)
-- ============================================
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 10. TABLE NOTIFICATIONS
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
-- INSERTION DES DONNÉES INITIALES
-- ============================================

-- Insertion des terrains
INSERT INTO public.fields (name, slug, image_url, dimensions, turf, lighting, locker_rooms, parking, players, price_per_hour, indoor, active) VALUES
('Terrain Alpha', 'alpha', '/fields/field-1.svg', '40 × 20 m', 'Gazon synthétique 5G', true, 2, true, '5 vs 5', 90, true, true),
('Terrain Vitesse', 'vitesse', '/fields/field-2.svg', '42 × 22 m', 'Gazon synthétique hybride', true, 2, true, '5 vs 5', 95, true, true),
('Terrain Élite', 'elite', '/fields/field-3.svg', '60 × 40 m', 'Gazon synthétique 5G', true, 4, true, '7 vs 7', 140, false, true),
('Grand Stade', 'grand-stade', '/fields/field-4.svg', '100 × 64 m', 'Gazon naturel', true, 6, true, '11 vs 11', 240, false, true);

-- Insertion des tarifs
INSERT INTO public.pricing (name, price, unit, features, highlighted, sort_order) VALUES
('À l''heure', 90, '/ heure', '["Bloc d''1 heure garanti", "Vestiaires + douches inclus", "Éclairage LED compris", "Annulation gratuite 24 h avant"]', false, 1),
('Journée', 650, '/ jour', '["Terrain privatisé 8 h – 23 h", "Coordinateur sur place", "Sonorisation incluse", "10 ballons de match fournis"]', true, 2),
('Tournoi', 1200, '/ événement', '["2 terrains + zone d''accueil", "Arbitres officiels", "Tableau des scores sur écran géant", "Podium et remise des trophées"]', false, 3),
('Entreprise', 1800, '/ événement', '["Complexe entier privatisé", "Traiteur & cafétéria dédiée", "Animation team-building", "Captation vidéo du match"]', false, 4);

-- Insertion des paramètres
INSERT INTO public.settings (key, value) VALUES
('open_hour', '8'),
('close_hour', '23'),
('contact', '{"phone":"+1 (450) 555-0192","email":"info@soccercity.ca"}');

-- ============================================
-- POLITIQUES RLS (Row Level Security)
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLITIQUES DE LECTURE PUBLIQUE
-- ============================================

CREATE POLICY "Lecture publique des terrains" ON public.fields
    FOR SELECT USING (true);

CREATE POLICY "Lecture publique des tarifs" ON public.pricing
    FOR SELECT USING (true);

CREATE POLICY "Lecture publique de la galerie" ON public.gallery
    FOR SELECT USING (true);

CREATE POLICY "Lecture publique des avis approuvés" ON public.reviews
    FOR SELECT USING (approved = true);

CREATE POLICY "Lecture publique des paramètres" ON public.settings
    FOR SELECT USING (true);

CREATE POLICY "Lecture publique des disponibilités" ON public.availability
    FOR SELECT USING (true);

-- ============================================
-- POLITIQUES DE CRÉATION PUBLIQUE
-- ============================================

CREATE POLICY "Création publique des réservations" ON public.reservations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Création publique des événements" ON public.private_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Création publique des avis" ON public.reviews
    FOR INSERT WITH CHECK (true);

-- ============================================
-- FONCTION ADMIN
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STORAGE - Buckets et politiques
-- ============================================

-- Créer le bucket pour les images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques de storage
CREATE POLICY "Lecture publique des images" ON storage.objects
    FOR SELECT USING (bucket_id = 'images');

CREATE POLICY "Upload authentifié des images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'images' 
        AND auth.role() = 'authenticated'
    );