-- v2 du schéma : ajoute les ligues (groupes) et bascule l'identité sur
-- Supabase Auth (email) plutôt que sur le code équipe + PIN maison.
-- À exécuter dans l'éditeur SQL Supabase. Si tu repars d'une base vierge,
-- exécute tout ce fichier. Si tu avais déjà l'ancien schéma (table `users`),
-- vois la note de migration en bas de fichier.

create extension if not exists pgcrypto;

-- Un profil par compte Supabase Auth (créé automatiquement à l'inscription,
-- voir le trigger plus bas). Le pseudo est modifiable ensuite dans l'app.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudo text not null,
  seniority_date date, -- date d'entrée en compagnie : détermine la priorité GP
  notify_new_flights boolean not null default false, -- opt-in : digest quotidien des vols postés (voir app/api/digest)
  created_at timestamptz not null default now()
);

-- Une ligue = un groupe de collègues avec son propre classement. On la
-- rejoint via un lien d'invitation (/join/{invite_code}) plutôt qu'un envoi
-- d'e-mail d'invitation, pour éviter d'avoir à configurer un service d'envoi
-- d'e-mails transactionnels en plus de celui de Supabase Auth.
create table if not exists leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null default substr(md5(random()::text), 1, 8),
  created_by uuid not null references profiles(id),
  show_consensus boolean not null default true, -- sagesse collective, togglable par ligue
  created_at timestamptz not null default now()
);

-- Table de jointure profils <-> ligues. Le classement (total_points) est
-- stocké ICI et non sur `profiles`, puisqu'une même personne peut avoir un
-- score différent dans chaque ligue à laquelle elle participe.
create table if not exists league_members (
  league_id uuid not null references leagues(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  total_points integer not null default 0,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create table if not exists flights (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  created_by uuid not null references profiles(id),
  flight_number text not null,
  flight_date date not null,
  origin text,
  destination text,
  scheduled_departure timestamptz not null,
  aircraft_type text,
  airline_code text, -- ex: AF, KL, TO, LH...
  data_tier text not null default 'basic' check (data_tier in ('rich', 'basic')),
  ticket_type text check (ticket_type in ('r2_eco', 'r2_premium', 'r2_business', 'r2s')),
  status text not null default 'open' check (status in ('open', 'closed', 'resolved')),
  actual_boarded boolean,
  actual_class text,
  actual_seats_remaining integer,
  resolved_at timestamptz,
  reminder_sent_at timestamptz, -- e-mail de rappel envoyé au posteur (24h après le décollage)
  added_digest_sent_at timestamptz, -- vol déjà inclus dans le digest quotidien "nouveaux vols" (voir app/api/digest)
  created_at timestamptz not null default now()
);

-- Un même posteur ne peut pas poster deux fois le même vol (numéro + date)
-- dans la même ligue — filet de sécurité en plus de la vérification côté
-- app (voir app/api/flights/route.ts), au cas où deux requêtes arriveraient
-- en même temps.
create unique index if not exists flights_no_duplicate_per_poster
  on flights (league_id, created_by, flight_number, flight_date);

-- Historique du remplissage constaté dans le temps : le tout premier constat
-- est obligatoire à la création du vol (même auteur que le vol), et
-- n'importe quel membre de la ligue peut en ajouter d'autres ensuite. On
-- garde toutes les entrées (pas d'écrasement) pour pouvoir afficher
-- l'évolution du remplissage ET de l'indice de difficulté dans le temps.
-- Uniquement pertinent pour les vols "rich" (AF/Transavia) — pour les
-- vols "basic" (KLM y compris), pas de remplissage détaillé disponible.
create table if not exists flight_load_updates (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid not null references flights(id) on delete cascade,
  submitted_by uuid not null references profiles(id),
  recorded_at timestamptz not null default now(),
  -- ex: {"Economy": {"sold": 120, "capacity": 148, "pad": 3}} — pad = nombre
  -- de standby (PAD) en attente sur cette cabine, pour estimer le pool de
  -- concurrents face au voyageur suivi (voir lib/difficulty.ts).
  seats_by_cabin jsonb not null default '{}'::jsonb,
  r1_count integer, -- nombre de R1 (priorité devant les R2) constatés sur ce vol
  difficulty numeric(3, 1), -- indice de difficulté calculé à cet instant (voir lib/difficulty.ts)
  -- Statut de couleur MyIdTravel, uniquement pour les vols "basic" (pas de
  -- remplissage détaillé) : proxy grossier de P(embarque), voir
  -- lib/constants.ts (MYIDTRAVEL_PBOARD) et lib/boardingProbability.ts.
  myidtravel_status text check (myidtravel_status in ('green', 'orange', 'red')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists flight_load_updates_flight_id_idx on flight_load_updates (flight_id);

create table if not exists bets (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid not null references flights(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  predicted_boarded boolean not null,
  predicted_class text,
  predicted_seats_remaining integer,
  points_awarded integer,
  placed_at timestamptz not null default now(), -- mis à jour à chaque modification du pari
  edit_count integer not null default 0, -- nombre de fois modifié : pénalise les points (voir lib/points.ts)
  unique (flight_id, user_id)
);

create index if not exists bets_flight_id_idx on bets (flight_id);
create index if not exists flights_league_id_idx on flights (league_id);
create index if not exists flights_scheduled_departure_idx on flights (scheduled_departure);
create index if not exists league_members_user_id_idx on league_members (user_id);

-- Crée automatiquement un profil dès qu'un compte Supabase Auth est créé
-- (inscription par e-mail / lien magique).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, pseudo)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Remarque sécurité : le serveur Next.js utilise la clé service_role pour
-- toutes les requêtes, donc la Row Level Security peut rester désactivée
-- sur ces tables (ou permissive) sans risque, puisque le navigateur ne
-- parle jamais directement à Supabase pour les données métier — seule
-- l'authentification (email / session) passe par le SDK Supabase côté
-- client, avec la clé anon/publique (sûre à exposer).

-- === Migration depuis l'ancien schéma (code équipe + PIN) ===
-- Si tu avais déjà créé les anciennes tables `users`/`flights`/`bets` :
--   1. Exporte les pseudos et points si tu veux les conserver.
--   2. drop table if exists bets, flights, users cascade;
--   3. Exécute ce fichier en entier.
--   4. Réintègre manuellement les anciennes données si besoin (les comptes
--      devront être recréés via l'inscription par e-mail).
