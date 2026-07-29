# Jump Seat

Une petite app pour pronostiquer, entre collègues, si quelqu'un va embarquer
sur son vol GP — et dans quelle classe, et combien il restera de sièges.

> ⚠️ **Non testé en conditions réelles.** Ce projet a été généré et étoffé
> par Claude sans accès réseau pour exécuter `npm install` / `npm run dev` —
> le code suit d'aussi près que possible les patterns officiels (Next.js App
> Router, Supabase Auth `@supabase/ssr`), mais mérite une relecture et un
> vrai test en local avant de le considérer fiable. C'est le premier réflexe
> à avoir en ouvrant ce projet dans Claude Code ou Claude Desktop.

- Chacun poste un vol (numéro + date), l'app va chercher les horaires et le
  type d'appareil automatiquement.
- Les collègues parient : embarque / n'embarque pas, classe obtenue, nombre
  de sièges restants.
- Plus le pari est posé tôt (loin du décollage), plus il rapporte de points
  — mais jamais 0, il reste une incertitude jusqu'à H-1h.
- Plusieurs ligues indépendantes, qu'on rejoint via un code d'invitation.
  Classement par ligue (points + distance parcourue), tableau à volets façon
  panneau d'aéroport.
- Indice de difficulté par vol (type de billet R2, vacances scolaires,
  ancienneté, remplissage...), dont l'évolution est affichée dans le temps.

## 1. Prérequis

- [Node.js](https://nodejs.org) 18 ou plus
- Un compte [Supabase](https://supabase.com) (gratuit)
- Un compte [Vercel](https://vercel.com) (gratuit) pour l'hébergement + le cron
- Une clé [AeroDataBox](https://rapidapi.com) pour les données de vol (section 5)
- Un compte [Resend](https://resend.com) (gratuit) pour l'e-mail de rappel (section 8)

## 2. Installation en local

```bash
npm install
# crée .env.local à la racine avec les variables listées aux sections 3-4 et 8
npm run dev
```

L'app est disponible sur http://localhost:3000.

## 3. Créer la base de données Supabase

1. Crée un projet sur [supabase.com](https://supabase.com).
2. **SQL Editor** → colle le contenu de `supabase/schema.sql` → exécute.
3. **Authentication → Providers** : vérifie que "Email" est activé (par
   défaut) — c'est ce qui gère l'inscription par lien magique.
4. **Project Settings → API** : récupère l'URL du projet, la clé `anon` et
   la clé `service_role`, à mettre dans `.env.local`.
5. **Authentication → URL Configuration** : ajoute `http://localhost:3000/auth/callback`
   (et l'équivalent en production, ex. `https://ton-app.vercel.app/auth/callback`)
   à la liste **Redirect URLs**, sinon le lien magique redirigera vers une
   URL refusée par Supabase. Mets aussi à jour le **Site URL** une fois
   déployé.

## 4. Authentification

Auth par e-mail (lien magique, sans mot de passe) via Supabase Auth :
- Client navigateur : `lib/supabase/client.ts`
- Client serveur (lecture de session) : `lib/supabase/server.ts`
- `middleware.ts` protège toutes les pages sauf `/login`, `/auth/callback`
- `app/auth/callback/route.ts` échange le code du lien magique contre une session

Le profil applicatif (pseudo, ancienneté) est séparé de l'auth : table
`profiles`, créée automatiquement par un trigger SQL à l'inscription (voir
`schema.sql`). Toutes les requêtes de données (vols, paris, ligues...)
passent par `lib/supabaseServer.ts` avec la clé `service_role` — le
navigateur ne lit/écrit jamais les données métier directement, seule l'auth
transite par le SDK client.

**Nouveau compte = pas d'ancienneté renseignée.** Le dashboard affiche un
lien vers `/profile` tant que `seniority_date` est vide.

## 5. Source des données de vol

**Air France, KLM, Transavia** (`data_tier = 'rich'`) : lookup automatique
(horaires, type d'appareil) via `lib/flightApi.ts`, branché sur AeroDataBox
(souscription gratuite possible sur RapidAPI/API.market). Idéalement à
remplacer par l'API officielle du portail développeur AF-KLM
(developer.airfranceklm.com) si l'accès est simple à obtenir en interne — la
fonction `lookupFlight` garde la même signature, donc rien d'autre à changer.
Le remplissage (sièges restants par cabine) n'existe sur aucune API publique
: pour ces trois compagnies, vous avez l'info en interne, saisie manuellement
à la création du vol puis mise à jour au fil du temps (section 7).

**Autres compagnies** (`data_tier = 'basic'`) : lookup toujours automatique
pour les horaires/type d'appareil, mais le pari se limite à embarque/pas
embarque — pas de pari sur la classe ni les sièges, faute de visibilité sur
le remplissage. Le tier est déduit du code compagnie (`lib/difficulty.ts` →
`getDataTier`), lui-même tiré de la réponse API ou, à défaut, du préfixe du
numéro de vol.

## 6. Types de billet R2 et priorité GP

Chaque vol posté précise le type de billet R2 utilisé (`lib/constants.ts` →
`TICKET_TYPES`), qui détermine la logique de surclassement/déclassement :

| Type | Logique |
|---|---|
| **R2 Éco standard** | Embarque normalement en Éco. Change de cabine seulement en cas de surclassement par surbooking, ou à la discrétion de l'équipage s'il reste de la place. |
| **R2 Premium / Business** | Prioritaire sur la cabine achetée s'il reste de la place ; sinon déclassé vers la meilleure cabine restante entre Premium et Éco. |
| **R2S** (éco à vocation surclassement) | Placé automatiquement dans la cabine la plus haut de gamme où il reste de la place. |

La priorité entre collègues sur liste d'attente se joue à l'ancienneté
(`seniority_date` sur le profil).

## 7. Remplissage et indice de difficulté

Deux circuits bien distincts (voir `BACKLOG.md` pour le détail de la
décision) :
- **Résultat final** (embarqué ou non, classe, sièges) : renseigné une seule
  fois, à la fin, par le posteur uniquement, une fois le vol décollé
  (`app/api/flights/[id]/route.ts`).
- **Remplissage en cours** (table `flight_load_updates`) : un premier constat
  est obligatoire à la création du vol (`app/api/flights/route.ts`), puis
  n'importe quel membre de la ligue peut en ajouter d'autres
  (`app/api/flights/[id]/load/route.ts`, composant `LoadUpdateForm`).

Chaque constat de remplissage recalcule un **indice de difficulté** (1 à 5,
`lib/difficulty.ts` → `computeDifficulty`), à partir de : type de billet R2 +
niveau d'info compagnie, vacances scolaires (`lib/schoolHolidays.ts`,
calendrier 2026-2027 codé en dur, à étendre chaque année), ancienneté, temps
restant avant le départ, dernier remplissage connu. Son évolution est
affichée sur la page du vol via un petit graphique (`DifficultySparkline`).
Volontairement simple pour commencer — à affiner en testant avec de vrais
vols, comme pour le barème de points.

Facteurs évoqués mais pas encore intégrés (voir `lib/difficulty.ts`) : jour
de semaine/heure de vol, saison haute hors vacances scolaires, taille de
l'appareil — ces deux derniers demanderaient un référentiel supplémentaire
qu'on n'a pas encore.

## 8. E-mail de rappel (Resend + cron Vercel)

Si le résultat n'est pas renseigné 24h après le décollage, un e-mail de
rappel part automatiquement vers le posteur (`lib/email.ts`,
`app/api/remind/route.ts`).

1. Crée un compte sur [resend.com](https://resend.com), récupère une clé API
   → `RESEND_API_KEY`. Le domaine d'essai `onboarding@resend.dev` fonctionne
   sans configuration DNS pour démarrer.
2. Génère un secret (`openssl rand -hex 32`) → `CRON_SECRET`.
3. `vercel.json` déclenche `/api/remind` une fois par jour (9h UTC) une fois
   déployé sur Vercel (les crons Vercel n'existent qu'en production, pas en
   local). Fréquence quotidienne imposée par le plan Hobby de Vercel (les
   crons plus fréquents nécessitent un plan Pro) ; passe à `0 * * * *` si tu
   upgrades. Vérifie dans le dashboard Vercel que le cron apparaît bien après
   le premier déploiement.

## 9. Ligues (groupes)

- Une ligue = un groupe avec son propre classement (table `leagues`).
- N'importe qui peut en créer une (`/leagues`), aucune restriction de rôle.
- On rejoint une ligue existante en saisissant son code d'invitation (affiché
  en haut du tableau des vols, `/l/{id}`) dans le formulaire de `/leagues`,
  plutôt que par e-mail individuel, pour éviter un second service d'envoi
  d'e-mails.
- Le score (`total_points`) est stocké par ligue dans `league_members`, pas
  sur le profil : une même personne a un classement indépendant dans chaque
  ligue à laquelle elle participe.
- La sagesse collective (répartition des pronostics de tout le monde sur
  chaque vol, `ConsensusBar`) est toujours affichée — plus de réglage par
  ligue pour la masquer (la colonne `leagues.show_consensus` reste en base
  mais n'est plus lue par l'app).

## 10. Où ajuster les règles du jeu

- `lib/constants.ts` : nom de l'app, classes de cabine, types de billet R2,
  compagnies à info "rich", barème de points, paliers du multiplicateur
  temporel, bonus de publication.
- `lib/points.ts` : la formule de calcul des points.
- `lib/difficulty.ts` : l'indice de difficulté.
- `lib/flightPhase.ts` : fenêtre de publication (3 jours), clôture des paris
  (H-1h), les 4 statuts d'un vol.
- `lib/schoolHolidays.ts` : calendrier des vacances scolaires.
- `lib/distance.ts` : référentiel d'aéroports pour la distance parcourue —
  pas exhaustif, complète-le si un aéroport manque.

## 11. Déploiement sur Vercel

1. Pousse ce projet sur un repo GitHub (privé de préférence).
2. Sur [vercel.com](https://vercel.com), "Add New Project" → importe le repo.
3. Ajoute toutes les variables de `.env.local` dans les réglages du projet
   Vercel (Environment Variables), y compris `NEXT_PUBLIC_SITE_URL` avec
   l'URL réelle une fois connue.
4. Déploie. Vérifie dans l'onglet **Cron Jobs** du projet Vercel que
   `/api/remind` apparaît bien programmé.
5. L'app est installable sur l'écran d'accueil (iPhone/Android) comme une
   app grâce au manifeste PWA (`app/manifest.ts`).

## 12. Ce qui reste volontairement de côté

Idées discutées mais pas implémentées (voir `BACKLOG.md`, section "à
trier/valider, rien n'est décidé") : classement mensuel, badges liés aux
types R2, digest hebdomadaire Slack/Teams. Ne pas les ajouter sans un go
explicite — c'est noté comme tel exprès.
