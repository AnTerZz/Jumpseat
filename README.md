# Jump Seat

Une petite app pour pronostiquer, entre collègues, si quelqu'un va embarquer
sur son vol GP — et dans quelle classe, et combien il restera de sièges.
Déployée sur Vercel + Supabase, testée en conditions réelles.

- Chacun poste un vol (numéro + date), l'app va chercher les horaires et le
  type d'appareil automatiquement.
- Les collègues parient : embarque / n'embarque pas, classe obtenue, nombre
  de sièges restants. Un pari posé peut être modifié, mais chaque
  modification coûte des points (dégressif, voir section 8).
- Une cote de probabilité d'embarquement ("P(board)") est affichée avant de
  parier, à côté du consensus des autres joueurs — parier à contre-courant
  et avoir raison rapporte plus de points. Détail complet du barème dans
  [`SCORING.md`](SCORING.md).
- Plusieurs ligues indépendantes, qu'on rejoint en saisissant un code
  d'invitation. Classement par ligue (points + distance parcourue + petits
  tops amusants), tableau à volets façon panneau d'aéroport.

## 1. Prérequis

- [Node.js](https://nodejs.org) 18 ou plus
- Un compte [Supabase](https://supabase.com) (gratuit)
- Un compte [Vercel](https://vercel.com) (gratuit) pour l'hébergement + le cron
- Une clé [AeroDataBox](https://api.market) pour les données de vol (section 5)
- Un compte [Resend](https://resend.com) (gratuit) pour l'e-mail de rappel
  et, idéalement, pour l'auth (section 4)

## 2. Installation en local

```bash
npm install
# crée .env.local à la racine avec les variables listées aux sections 3-5
npm run dev
```

L'app est disponible sur http://localhost:3000.

## 3. Base de données Supabase

1. Crée un projet sur [supabase.com](https://supabase.com).
2. **SQL Editor** → colle le contenu de `supabase/schema.sql` → exécute
   (couvre tout le schéma à jour, y compris les ligues, le remplissage
   détaillé et les modifications de pari).
3. **Project Settings → API** : récupère l'**URL du projet** (celle qui
   ressemble à `https://xxxxx.supabase.co`, **pas** l'URL du dashboard) et
   les clés `anon` / `service_role`, à mettre dans `.env.local`.
4. **Authentication → URL Configuration** :
   - **Site URL** : l'URL complète avec `https://` (ex.
     `https://ton-app.vercel.app`) — sans le préfixe, Supabase construit des
     redirections cassées.
   - **Redirect URLs** : ajoute `http://localhost:3000/auth/callback` et
     l'équivalent en production (`https://ton-app.vercel.app/auth/callback`).

### Si tu repars d'une base déjà créée avant certaines fonctionnalités

`schema.sql` est à jour pour une base neuve, mais une base déjà existante ne
récupère pas automatiquement les nouvelles colonnes. Exécute au besoin :

```sql
alter table flight_load_updates add column if not exists r1_count integer;
alter table bets add column if not exists edit_count integer not null default 0;
```

(`seats_by_cabin` et son champ `pad` par cabine sont dans une colonne jsonb
existante, donc rien à migrer pour ça.)

## 4. Authentification

Auth par e-mail, sans mot de passe, via Supabase Auth (`@supabase/ssr`) —
**deux façons de se connecter**, envoyées dans le même e-mail :
- un lien magique classique ;
- un **code à 6 chiffres**, saisi directement dans l'app
  (`supabase.auth.verifyOtp`). Utile quand un scanner de sécurité d'entreprise
  "pré-visite" les liens et grille le lien avant que tu ne cliques dessus —
  le code, lui, n'est jamais touché puisqu'il ne s'agit pas d'une URL.

Pour que l'e-mail contienne bien le code, édite le template Supabase :
**Authentication → Email Templates → Magic Link** → ajoute `{{ .Token }}`
quelque part dans le corps du message.

Le compte Supabase gratuit limite les e-mails d'auth à quelques envois par
heure. Pour tester sans butter contre cette limite, configure un SMTP
personnalisé (**Project Settings → Authentication → SMTP Settings**) avec
Resend : hôte `smtp.resend.com`, utilisateur `resend`, mot de passe = ta clé
API Resend, expéditeur sur un domaine que tu as vérifié dans Resend (le
domaine d'essai `resend.dev` ne fonctionne pas en SMTP, seulement via l'API).

Fichiers clés :
- Client navigateur : `lib/supabase/client.ts`
- Client serveur (lecture de session) : `lib/supabase/server.ts`
- `middleware.ts` protège toutes les pages sauf `/login`, `/auth/callback`
- `app/auth/callback/route.ts` échange le code du lien magique contre une session
- `app/login/page.tsx` gère le formulaire (e-mail, puis code ou lien)

Le profil applicatif (pseudo, ancienneté) est séparé de l'auth : table
`profiles`, créée automatiquement par un trigger SQL à l'inscription (voir
`schema.sql`). Toutes les requêtes de données (vols, paris, ligues...)
passent par `lib/supabaseServer.ts` avec la clé `service_role` — le
navigateur ne lit/écrit jamais les données métier directement, seule l'auth
transite par le SDK client.

**Nouveau compte = pas d'ancienneté renseignée.** Le dashboard affiche un
lien vers `/profile` tant que `seniority_date` est vide ; impossible de
créer ou rejoindre une ligue sans l'avoir renseignée.

## 5. Source des données de vol

**Air France et Transavia** (`data_tier = 'rich'`) : lookup automatique
(horaires, type d'appareil) via `lib/flightApi.ts`, branché sur AeroDataBox
via le proxy **[API.market](https://api.market)** (`prod.api.market/api/v1/aedbx/aerodatabox/...`,
en-tête `x-api-market-key`). Attention : les clés **API.market** (format
court, type `cms57...`) sont différentes des clés **RapidAPI** classiques
(longues chaînes hexadécimales) pour le même fournisseur AeroDataBox — elles
utilisent un host et un en-tête différents. Si ta clé vient de RapidAPI
directement, il faut adapter l'URL/en-tête dans `lib/flightApi.ts` (commentaire
en tête de fichier).

Le remplissage détaillé (sièges vendus/restants par cabine, PAD, R1)
n'existe sur aucune API publique : pour ces deux compagnies, l'info est
saisie manuellement à la création du vol puis mise à jour au fil du temps
(section 7). Transavia ne vend que de l'Économie : le formulaire de
remplissage ne propose que cette cabine pour ses vols
(`lib/constants.ts` → `getCabinClasses`).

**Autres compagnies, y compris KLM** (`data_tier = 'basic'`) : lookup
toujours automatique pour les horaires/type d'appareil, mais le pari se
limite à embarque/pas embarque — pas de pari sur la classe ni les sièges,
faute de visibilité sur le remplissage. Le tier est déduit du code compagnie
(`lib/difficulty.ts` → `getDataTier`), lui-même tiré de la réponse API ou, à
défaut, du préfixe du numéro de vol.

## 6. Types de billet R2 et priorité GP

Chaque vol posté sur une compagnie "rich" précise le type de billet R2
utilisé (`lib/constants.ts` → `TICKET_TYPES`), qui détermine la logique de
surclassement/déclassement :

| Type | Logique |
|---|---|
| **R2 Éco standard** | Embarque normalement en Éco. Change de cabine seulement en cas de surclassement par surbooking, ou à la discrétion de l'équipage s'il reste de la place. |
| **R2 Premium / Business** | Prioritaire sur la cabine achetée s'il reste de la place ; sinon déclassé vers la meilleure cabine restante entre Premium et Éco. |
| **R2S** (éco à vocation surclassement) | Placé automatiquement dans la cabine la plus haut de gamme où il reste de la place. |

La priorité entre collègues sur liste d'attente se joue à l'ancienneté
(`seniority_date` sur le profil) : voir section 8 pour comment elle entre
dans le calcul de probabilité.

## 7. Remplissage : PAD, R1 et historique

Deux circuits bien distincts :
- **Résultat final** (embarqué ou non, classe, sièges) : renseigné une seule
  fois, à la fin, par le posteur uniquement, une fois le vol décollé
  (`app/api/flights/[id]/route.ts`).
- **Remplissage en cours** (table `flight_load_updates`) : un premier constat
  est obligatoire à la création du vol pour les compagnies "rich"
  (`app/api/flights/route.ts`), puis n'importe quel membre de la ligue peut
  en ajouter d'autres (`app/api/flights/[id]/load/route.ts`, composant
  `LoadUpdateForm`). Chaque constat donne, par cabine : sièges vendus,
  capacité totale, et **PAD** (nombre de standby en attente sur cette
  cabine) — plus un compte de **R1** au niveau du vol (personnel prioritaire
  qui embarque avant tout R2).

Le dernier constat connu est affiché en évidence sur la page du vol (table
Cabine/Vendus/Restants/PAD), juste avant de parier — c'est la donnée la plus
utile pour décider d'un pronostic.

## 8. Système de score

Détail complet, historique des décisions et plan de calibration future dans
[`SCORING.md`](SCORING.md). Résumé :

```
points = TimeMultiplier(délai avant décollage au moment du pari)
       × [ boardWeight × BoardOddsTerm + classWeight × ClassTerm + seatsWeight × SeatsTerm ]
       × pénalité de modification (si le pari a été changé)
```

- Pronostic d'embarquement faux → **0 point**, quel que soit le reste.
- `BoardOddsTerm` = cote sur P(embarque) : parier contre le modèle et avoir
  raison rapporte plus. P(embarque) est calculée par
  `lib/boardingProbability.ts` (sièges restants, PAD pondéré par
  l'ancienneté du posteur, R1, temps restant) — c'est une **heuristique de
  départ**, pas encore un modèle fitté sur des données réelles. Elle est
  volontairement amortie vers 50% pour le calcul des points
  (`SCORING_SHRINKAGE`) tant qu'elle n'est pas validée, même si la valeur
  affichée aux joueurs reste la vraie estimation.
- `ClassTerm` : probabilité fixe de 1/3 (une des 3 cabines), en attente des
  règles de surclassement exactes pour être affinée.
- Plafond théorique : 100 points par pari.
- Modifier un pari déjà posé coûte des points de façon cumulative
  (`POINTS.betChangePenaltyPerEdit`).
- Une fois le vol résolu, chaque pronostic affiche le détail complet du
  calcul (probabilité utilisée, chaque terme, multiplicateur, pénalité).

**Collecte de données pour calibrer le modèle** : `data/flight_load_training_template.csv`
contient un gabarit de 100 vols réels AF/KLM (remplissage agrégé à
plusieurs instants, sans aucune donnée individuelle) à remplir
progressivement — voir `SCORING.md` pour le plan complet (comment le
remplir, comment fitter un modèle simple à partir de ça, comment
réentraîner ensuite sur les données réelles de l'app). Les lignes KLM
datent d'avant son passage en "basic" (section 5) : encore utilisables mais
plus vraiment représentatives de ce que l'app suit désormais.

## 9. Ligues (groupes)

- Une ligue = un groupe avec son propre classement (table `leagues`).
- N'importe qui peut en créer une (`/leagues`, via une popup), aucune
  restriction de rôle.
- On rejoint une ligue existante en saisissant son code d'invitation
  (affiché en haut du tableau des vols, `/l/{id}`) dans une popup dédiée sur
  `/leagues` — pas de lien à partager, juste un code à recopier.
- Le score (`total_points`) est stocké par ligue dans `league_members`, pas
  sur le profil : une même personne a un classement indépendant dans chaque
  ligue à laquelle elle participe.
- La sagesse collective (répartition des pronostics de tout le monde sur
  chaque vol, `ConsensusBar`) est toujours affichée, sans réglage par ligue.
- Classement (`/l/{id}/leaderboard`) : points, distance parcourue (vols
  effectivement embarqués), et une section "petits tops" (le plus souvent
  refusé, le plus souvent en Business, le plus indécis).

## 10. E-mail de rappel (Resend + cron Vercel)

Si le résultat n'est pas renseigné 24h après le décollage, un e-mail de
rappel part automatiquement vers le posteur (`lib/email.ts`,
`app/api/remind/route.ts`).

1. Récupère une clé API Resend → `RESEND_API_KEY` (même compte que pour le
   SMTP d'auth si tu l'as configuré, section 4).
2. Génère un secret (`openssl rand -hex 32`) → `CRON_SECRET`.
3. `vercel.json` déclenche `/api/remind` une fois par jour (9h UTC) une fois
   déployé sur Vercel (les crons Vercel n'existent qu'en production, pas en
   local). Fréquence quotidienne imposée par le plan Hobby de Vercel (les
   crons plus fréquents nécessitent un plan Pro) ; passe à `0 * * * *` si tu
   upgrades.

## 11. Outils de test (locaux uniquement, jamais déployés)

- `npm run simulate-flight` — liste les vols non résolus d'une ligue ;
  `npm run simulate-flight -- <flightId> [minutesDansLePassé]` recule le
  décollage d'un vol pour pouvoir le résoudre immédiatement dans l'UI et
  tester le calcul de points sans attendre le vrai décollage.
- `npm run simulate-scoring` — exécute une série de scénarios (favori,
  outsider, pari tardif, pari modifié plusieurs fois, cas extrêmes...) à
  travers le vrai code de scoring (`lib/points.ts` /
  `lib/boardingProbability.ts`) et affiche le détail, pour vérifier que le
  barème reste équilibré après un changement de constantes.

## 12. Où ajuster les règles du jeu

- `lib/constants.ts` : nom de l'app, classes de cabine, types de billet R2,
  compagnies à info "rich", barème de points (poids, plafonds, pénalités),
  paliers du multiplicateur temporel.
- `lib/points.ts` : la formule de calcul des points et son détail.
- `lib/boardingProbability.ts` : le calcul de P(embarque) (heuristique).
- `lib/difficulty.ts` : cabines pertinentes par type de billet, aide au
  calcul de probabilité.
- `lib/flightPhase.ts` : fenêtre de publication (24h), clôture des paris
  (H-1h), les 4 statuts d'un vol.
- `lib/schoolHolidays.ts` : calendrier des vacances scolaires.
- `lib/distance.ts` : référentiel d'aéroports pour la distance parcourue —
  pas exhaustif, complète-le si un aéroport manque.

## 13. Déploiement sur Vercel

1. Pousse ce projet sur un repo GitHub (privé de préférence). `.env.local`
   est ignoré par git — ne le commite jamais (il contient la clé
   `service_role`, accès total à la base).
2. Sur [vercel.com](https://vercel.com), "Add New Project" → importe le repo.
3. **Vérifie que "Framework Preset" est bien réglé sur "Next.js"**, pas
   "Other" — sinon le middleware plante en prod avec une erreur
   `__dirname is not defined` (Vercel n'applique pas le bundling Edge
   Runtime attendu par `@supabase/ssr` si le framework n'est pas détecté).
4. Ajoute toutes les variables de `.env.local` dans les réglages du projet
   Vercel (Environment Variables), y compris `NEXT_PUBLIC_SITE_URL` avec
   l'URL réelle une fois connue (un changement de variable d'environnement
   nécessite un redéploiement pour prendre effet).
5. Déploie. Vérifie dans l'onglet **Cron Jobs** du projet Vercel que
   `/api/remind` apparaît bien programmé.
6. Retourne dans Supabase → **Authentication → URL Configuration** : mets à
   jour le **Site URL** et ajoute `https://ton-url.vercel.app/auth/callback`
   aux **Redirect URLs** (voir section 3 pour le piège du `https://` manquant).
7. L'app est installable sur l'écran d'accueil (iPhone/Android) comme une
   app grâce au manifeste PWA (`app/manifest.ts`).

## 14. Ce qui reste volontairement de côté

Idées discutées mais pas implémentées (voir `BACKLOG.md`, section "à
trier/valider, rien n'est décidé") : classement mensuel, badges liés aux
types R2, digest hebdomadaire Slack/Teams. Ne pas les ajouter sans un go
explicite — c'est noté comme tel exprès.
