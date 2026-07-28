# Idées & règles — suivi

Ce fichier continue de rassembler les idées discutées au fil de l'eau.
Depuis la dernière session, la plupart des règles/idées ont été codées —
détail ci-dessous. Rien de tout ça n'a pu être testé en conditions réelles
(pas d'accès réseau côté Claude pour lancer `npm run dev`) : à vérifier
attentivement en premier ce soir plutôt qu'à prendre pour acquis.

## ✅ Implémenté cette session

**Fenêtre de publication et de pari**
- Un vol ne peut être posté que s'il décolle dans au moins 3 jours
  (`lib/flightPhase.ts` → `isAtLeastThreeDaysOut`, vérifié dans
  `app/api/flights/route.ts`).
- Paris ouverts jusqu'à H-1h avant le décollage (`canPlaceBet`,
  `app/api/bets/route.ts`).
- Le multiplicateur de points ne tombe jamais à 0 (plancher x1, `lib/points.ts`
  — c'était déjà le cas, mais maintenant explicitement documenté comme
  intentionnel vu la clôture à H-1h).

**Statuts et affichage**
- 4 statuts calculés depuis les horodatages (`lib/flightPhase.ts`) : ouvert /
  paris clos / en attente de résultat / résolu. Utilisés dans
  `FlightBoardRow`, le tableau de bord et la page de vol.
- Tableau de bord : vols à venir triés chronologiquement, vols passés en
  dessous (`app/l/[leagueId]/page.tsx`).
- Vue calendrier mensuelle (`app/l/[leagueId]/calendar/page.tsx`).

**Ligues**
- Création libre (`app/api/leagues/route.ts`), rejoindre via lien
  d'invitation `/join/[code]`, page de liste `/leagues`.
- Score stocké par ligue (`league_members.total_points`), pas sur le profil.
- Réglages de ligue (`/l/[id]/settings`) : lien d'invitation, bascule
  sagesse collective (réservée au créateur de la ligue).

**Remplissage et difficulté**
- Deux circuits distincts : résultat final (une fois, par le posteur, après
  décollage — `app/api/flights/[id]/route.ts`) vs remplissage en cours
  (table `flight_load_updates`, plusieurs entrées horodatées, ouvertes à
  tout membre de la ligue — `app/api/flights/[id]/load/route.ts`,
  composant `LoadUpdateForm`).
- Premier constat de remplissage obligatoire à la création du vol pour les
  compagnies "rich" (`app/l/[leagueId]/flights/new/page.tsx`).
- Indice de difficulté (`lib/difficulty.ts`) intégrant : type de billet R2 +
  data_tier, vacances scolaires (`lib/schoolHolidays.ts`, calendrier réel
  2026-2027), ancienneté, temps restant avant le départ, dernier
  remplissage connu.
- Évolution de la difficulté affichée sur la page du vol
  (`DifficultySparkline`, mini graphique SVG).

**Autres**
- Sagesse collective togglable par ligue (`ConsensusBar`,
  `leagues.show_consensus`).
- Distance parcourue : classement par ligue (`app/l/[leagueId]/leaderboard/page.tsx`),
  ne compte que les vols avec `actual_boarded = true`, via un référentiel
  d'aéroports non-exhaustif à compléter au besoin (`lib/distance.ts`).
- Rappel automatique par e-mail 24h après le décollage si non résolu
  (`lib/email.ts` via Resend, route cron `app/api/remind/route.ts`,
  `vercel.json`).
- Migration complète de l'auth code+PIN vers Supabase Auth (lien magique par
  e-mail) — voir README section 4.
- Page de profil pour saisir pseudo + ancienneté (`/profile`), puisque
  l'inscription par e-mail ne les demande plus automatiquement.

**Facteurs de difficulté évoqués mais toujours pas intégrés** (noté dans
`lib/difficulty.ts`, pas oubliés, juste pas faits) : jour de semaine/heure de
vol, saison haute hors vacances scolaires, taille de l'appareil — ces deux
derniers demanderaient un référentiel supplémentaire (capacité par type
d'appareil) qu'on n'a pas.

## 🕐 Toujours en attente d'un go explicite (rien n'est décidé)

Pas implémenté volontairement — ce sont des idées de Claude, pas des
demandes confirmées. À activer seulement si tu le demandes :

- Classement mensuel en parallèle du classement général.
- Badges discrets liés aux types R2 (ex. "Optimiste", meilleur
  pronostiqueur par type de billet).
- Digest hebdomadaire automatique dans Slack/Teams.

## ❌ Rejeté

- Double ou rien limité — pas retenu, trop de complexité pour un gain
  incertain.

## À vérifier en premier ce soir

- `npm install` puis `npm run dev` : premier vrai test du projet.
- Le flux Supabase Auth complet (lien magique → callback → session →
  middleware) n'a jamais tourné réellement — c'est la partie la plus
  susceptible d'avoir un bug de configuration (URLs de redirection à
  autoriser dans Supabase Authentication → URL Configuration, notamment).
- Les noms de contraintes FK utilisés dans les requêtes Supabase
  (`flights_created_by_fkey` etc.) supposent la convention de nommage par
  défaut de Postgres — à confirmer une fois la base créée.
