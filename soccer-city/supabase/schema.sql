-- ═══════════════════════════════════════════════════════════════
--  SOCCER CITY — Schéma PostgreSQL (Supabase)
--  10 tables + relations + politiques RLS de base.
--  Exécuter dans l'éditeur SQL de Supabase.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ── 1. USERS ─────────────────────────────────────────────────
-- Prolonge auth.users (Supabase Auth) avec le profil applicatif.
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  first_name  text not null,
  last_name   text not null,
  email       text not null unique,
  phone       text,
  role        text not null default 'client' check (role in ('client','admin')),
  created_at  timestamptz not null default now()
);

-- ── 2. FIELDS (terrains) ─────────────────────────────────────
create table public.fields (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null,
  slug           text not null unique,
  image_url      text,
  dimensions     text not null,
  turf           text not null,
  lighting       boolean not null default true,
  locker_rooms   int  not null default 2,
  parking        boolean not null default true,
  players        text not null,            -- "5 vs 5", "11 vs 11"…
  price_per_hour numeric(8,2) not null,
  indoor         boolean not null default false,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ── 3. RESERVATIONS ──────────────────────────────────────────
-- Blocs stricts d'une heure : `hour` = heure de début (8 → 08:00-09:00).
create table public.reservations (
  id         uuid primary key default uuid_generate_v4(),
  field_id   uuid not null references public.fields(id) on delete cascade,
  user_id    uuid references public.users(id) on delete set null,
  user_name  text not null,
  user_email text not null,
  user_phone text not null,
  date       date not null,
  hour       int  not null check (hour between 8 and 22),
  price      numeric(8,2) not null,
  status     text not null default 'confirmed' check (status in ('pending','confirmed','cancelled')),
  created_at timestamptz not null default now(),
  -- Un seul client par terrain / date / créneau (hors annulations)
  constraint uq_slot unique (field_id, date, hour)
);
create index idx_reservations_field_date on public.reservations(field_id, date);
create index idx_reservations_user on public.reservations(user_id);

-- ── 4. PRIVATE_EVENTS (demandes d'événements) ────────────────
create table public.private_events (
  id         uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name  text not null,
  company    text,
  phone      text not null,
  email      text not null,
  date       date not null,
  guests     int  not null check (guests between 1 and 500),
  type       text not null check (type in ('Anniversaire','Tournoi','Entreprise','École','Événement privé','Compétition')),
  message    text not null,
  status     text not null default 'new' check (status in ('new','accepted','declined')),
  created_at timestamptz not null default now()
);

-- ── 5. AVAILABILITY (créneaux bloqués par l'admin) ───────────
create table public.availability (
  id       uuid primary key default uuid_generate_v4(),
  field_id uuid not null references public.fields(id) on delete cascade,
  date     date not null,
  hour     int  not null check (hour between 8 and 22),
  blocked  boolean not null default true,
  reason   text,
  constraint uq_block unique (field_id, date, hour)
);

-- ── 6. PRICING (offres commerciales) ─────────────────────────
create table public.pricing (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  price       numeric(8,2) not null,
  unit        text not null,               -- "/ heure", "/ jour"…
  features    jsonb not null default '[]',
  highlighted boolean not null default false,
  sort_order  int not null default 0
);

-- ── 7. REVIEWS (avis clients) ────────────────────────────────
create table public.reviews (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references public.users(id) on delete set null,
  author     text not null,
  role       text,
  rating     int not null check (rating between 1 and 5),
  text       text not null,
  approved   boolean not null default false,  -- modération avant affichage
  created_at timestamptz not null default now()
);

-- ── 8. GALLERY ───────────────────────────────────────────────
create table public.gallery (
  id         uuid primary key default uuid_generate_v4(),
  image_url  text not null,                -- Supabase Storage
  alt        text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ── 9. SETTINGS (paramètres du site, clé/valeur) ─────────────
create table public.settings (
  key        text primary key,             -- 'open_hour', 'close_hour', 'phone'…
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.settings (key, value) values
  ('open_hour',  '8'),
  ('close_hour', '23'),
  ('contact',    '{"phone":"+1 (450) 555-0192","email":"info@soccercity.ca"}');

-- ── 10. NOTIFICATIONS ────────────────────────────────────────
create table public.notifications (
  id        uuid primary key default uuid_generate_v4(),
  title     text not null,
  body      text not null,
  audience  text not null default 'all' check (audience in ('all','clients','admins')),
  sent_by   uuid references public.users(id) on delete set null,
  sent_at   timestamptz not null default now()
);

-- ═══ RLS — politiques de base ════════════════════════════════
alter table public.users          enable row level security;
alter table public.fields         enable row level security;
alter table public.reservations   enable row level security;
alter table public.private_events enable row level security;
alter table public.availability   enable row level security;
alter table public.pricing        enable row level security;
alter table public.reviews        enable row level security;
alter table public.gallery        enable row level security;
alter table public.settings       enable row level security;
alter table public.notifications  enable row level security;

-- Aide : l'appelant est-il admin ?
create or replace function public.is_admin() returns boolean
language sql stable security definer as
$$ select exists (select 1 from public.users where id = auth.uid() and role = 'admin') $$;

-- Lecture publique du contenu du site
create policy "fields_read"   on public.fields   for select using (true);
create policy "pricing_read"  on public.pricing  for select using (true);
create policy "gallery_read"  on public.gallery  for select using (true);
create policy "reviews_read"  on public.reviews  for select using (approved);
create policy "settings_read" on public.settings for select using (true);
create policy "avail_read"    on public.availability for select using (true);

-- Réservations : création publique (invités), lecture par le propriétaire ou l'admin
create policy "res_insert" on public.reservations for insert with check (true);
create policy "res_read"   on public.reservations for select using (user_id = auth.uid() or public.is_admin());
create policy "res_update" on public.reservations for update using (public.is_admin());

-- Demandes d'événement : création publique, gestion admin
create policy "evt_insert" on public.private_events for insert with check (true);
create policy "evt_admin"  on public.private_events for select using (public.is_admin());
create policy "evt_update" on public.private_events for update using (public.is_admin());

-- Profils : chacun voit/édite le sien, l'admin voit tout
create policy "users_self_read"   on public.users for select using (id = auth.uid() or public.is_admin());
create policy "users_self_update" on public.users for update using (id = auth.uid());

-- Écriture réservée à l'admin sur le contenu du site
create policy "fields_admin"  on public.fields        for all using (public.is_admin());
create policy "pricing_admin" on public.pricing       for all using (public.is_admin());
create policy "gallery_admin" on public.gallery       for all using (public.is_admin());
create policy "avail_admin"   on public.availability  for all using (public.is_admin());
create policy "notif_admin"   on public.notifications for all using (public.is_admin());
create policy "reviews_admin" on public.reviews       for all using (public.is_admin());
create policy "settings_admin" on public.settings     for update using (public.is_admin());
