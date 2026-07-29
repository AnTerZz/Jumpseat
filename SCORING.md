# Système de score — plan et état actuel

Document de travail : ce qu'on a décidé, ce qui est implémenté en best-guess
en attendant de vraies données, et ce qui reste ouvert. À tenir à jour au
fil des sessions (comme BACKLOG.md).

## Deux métriques distinctes

- **Indice de difficulté** (`lib/difficulty.ts`, existant) : jauge générale
  1-5, affichée (sparkline), pas critique niveau précision.
- **P(embarque)** (`lib/boardingProbability.ts`, nouveau) : estimation
  probabiliste précise pour une personne donnée sur un vol donné à un
  instant donné. C'est elle qui pilote les points. Affichée aux joueurs
  avant de parier ("cote actuelle"), comme une cote de bookmaker — décision
  confirmée : *oui*, visible avant le pari.

## Formule de points (décidée)

```
points = TimeMultiplier(heures avant décollage au moment du pari)
       × [ boardWeight × BoardOddsTerm
         + classWeight × ClassTerm
         + seatsWeight × SeatsTerm ]
```

Si le pronostic d'embarquement est faux : **0 point**, quel que soit le
reste (classe/sièges non évalués). Décision confirmée.

- **BoardOddsTerm** = `1 / P(issue réelle)`, plafonné (`POINTS.oddsCap`).
  `P(issue réelle)` = P(embarque) si le pari était "embarque" et juste, ou
  son complément si le pari était "n'embarque pas" et juste. C'est le
  mécanisme "cote" : parier contre les pronostics et avoir raison paie plus.
- **ClassTerm** = `1/CLASS_PROBABILITY` (= 3, cote sur une probabilité fixe
  de 1/3 — 3 cabines possibles) si classe correcte (embarquement déjà
  correct), sinon 0. *P(classe) reste une constante fixe pour l'instant, pas
  encore modélisée par cabine* — en attente des règles de surclassement
  exactes.
- **SeatsTerm** = crédit partiel dégressif sur l'écart de sièges (tolérance
  `POINTS.seatsTolerance`), pas encore pondéré par une vraie P(sièges).

Toutes les constantes (`POINTS.boardWeight/classWeight/seatsWeight/oddsCap/
seatsTolerance` dans `lib/constants.ts`) sont des **hypothèses de départ**,
pas des valeurs calibrées.

**Plafond théorique = 100 points** (décision confirmée). Calcul : `TimeMultiplier
max (3) × (boardWeight × oddsCap + classWeight × (1/CLASS_PROBABILITY) + seatsWeight)
= 100`. `classWeight` a été divisé par 3 (3.0303 → 1.0101) quand ClassTerm
est passé de "bonus plat" (max 1) à "cote sur P=1/3 fixe" (max 3), pour que
sa part du plafond reste identique à avant.

**Important** : ce plafond de 100 suppose que `oddsCap` (6) est réellement
atteignable. Tant que `SCORING_SHRINKAGE` (voir section suivante) amortit
`P(embarque)` vers 50%, le maximum *pratique* est plus bas (~60 pts
actuellement, voir simulation) — le plafond de 100 ne redevient atteignable
qu'une fois l'amortissement desserré après calibration. C'est voulu : le
plafond théorique est la cible long terme, le plafond pratique actuel est
volontairement plus serré (voir décision confirmée #6).

## Amortissement temporaire de P(embarque) pour le scoring

`computePBoard()` reste une heuristique non calibrée. Pour éviter qu'elle
fasse trop varier les scores tant qu'elle n'est pas validée sur données
réelles, le calcul des points utilise `computePBoardForScoring()`
(`lib/boardingProbability.ts`), qui resserre la probabilité vers 50% d'un
facteur `SCORING_SHRINKAGE = 0.4` :

```
pBoardForScoring = 0.5 + (pBoardBrut − 0.5) × SCORING_SHRINKAGE
```

**La valeur affichée aux joueurs reste la probabilité brute** (`computePBoard`,
non amortie) — seul le calcul des points utilise la version amortie. Avec
`SCORING_SHRINKAGE = 0.4`, la plage effective utilisée pour le scoring est
resserrée à environ `[32%, 68%]` au lieu de `[5%, 95%]`. À desserrer
(rapprocher de 1) une fois le modèle calibré sur de vraies données ;
`SCORING_SHRINKAGE = 1` reviendrait à ne plus amortir du tout.

## P(embarque) — comment c'est calculé aujourd'hui (best-guess)

`lib/boardingProbability.ts` → `computePBoard()`. Sans vrai modèle fitté,
heuristique basée sur :

1. **Sièges restants** dans la cabine pertinente selon le type de billet
   (`getRelevantCabins` dans `lib/difficulty.ts`).
2. **R1** : embarquent toujours avant les R2, donc retirés des sièges
   disponibles avant tout calcul (`seatsAfterR1 = seatsLeft - r1Count`).
3. **PAD (standby en attente) + ancienneté du posteur** → rang estimé dans
   la file :
   - **30 ans d'ancienneté ou plus = tête de file (percentile 0).**
   - **0 an d'ancienneté = ~80% de la file devant soi (percentile 80).**
   - Variation **linéaire** entre les deux
     (`SENIORITY_TOP_YEARS = 30`, `SENIORITY_ZERO_PERCENTILE = 80`).
   - Rang estimé = `percentile/100 × PAD`.
4. **Marge** = sièges disponibles après R1 − rang estimé. Positif = plutôt
   favorable.
5. **Seuil nécessaire pour un 50/50, linéaire dans le temps** (remplace
   l'ancienne fonction logistique) : à 1 mois (720h) du décollage, il faut
   une marge d'au moins **30% de la capacité de la cabine** pertinente
   au-delà du rang estimé pour être à 50/50 (`REQUIRED_BUFFER_FRACTION_AT_1_MONTH`,
   `BUFFER_HORIZON_HOURS`) ; ce seuil diminue **linéairement jusqu'à 0%** le
   jour du décollage (la situation est alors figée : être pile à son rang
   suffit pour un 50/50). L'écart entre la marge réelle et ce seuil (en %
   de la capacité de la cabine) est ensuite converti linéairement en
   probabilité autour de 50% (`PROBABILITY_SLOPE`, calibré pour qu'un écart
   de ±50% de la capacité atteigne les bornes ci-dessous).
6. Bornée à `[5%, 95%]` — jamais de certitude absolue affichée.
7. Compagnie "basic" ou aucun remplissage renseigné → 50% neutre
   (`NO_DATA_PBOARD`).

Ancienneté utilisée : **celle du posteur du vol** (la personne qui tente
d'embarquer), pas celle du parieur.

## Ce qui n'est pas encore modélisé statistiquement

- **PClass** et **PSeats** : actuellement des bonus plats, pas des cotes.
  À construire une fois les règles exactes de priorité/surclassement
  fournies — probablement peu de statistique nécessaire, plutôt de la
  logique déterministe (R2 Eco reste Eco sauf surbooking, R2 Premium/
  Business priorité sur cabine achetée sinon meilleure restante, R2S placé
  sur la plus haute cabine dispo).
- **PBoard** lui-même : heuristique, pas un modèle fitté. Objectif = le
  remplacer par une vraie régression logistique une fois assez de données
  réelles collectées (voir plus bas).

## Collecte de données — plan

Fichier : **`data/flight_load_training_template.csv`** — 100 vols réels
AF/KLM (25 AF long-courrier / 25 AF moyen-courrier / 25 KLM long-courrier /
25 KLM moyen-courrier), 5 constats de remplissage chacun (J-14, J-3, J-1,
H-2, réel au départ), ~36% en période de vacances scolaires. Aucune donnée
individuelle (que de l'agrégé : sièges vendus/capacité/PAD par cabine,
nombre de R1, nombre total de personnel souhaitant embarquer) — pas de
souci de confidentialité.

**Pourquoi pas de données par personne** : impossible à obtenir côté
utilisateur ; le modèle se construit donc sur des **taux d'embarquement
agrégés** (sièges libres au départ ÷ demande totale), pas sur des
étiquettes individuelles boarded=Y/N.

**Statut** : template généré, pas encore rempli. Prochaine étape :
remplir progressivement, puis fitter.

## Comment on fittera le modèle (plan, pas encore fait)

1. Nettoyer/exporter le CSV.
2. Régression logistique (ou simple) sur le **taux d'embarquement agrégé**
   par vol en fonction de : sièges restants par snapshot, PAD, R1,
   ancienneté (percentile), vacances scolaires, jour de semaine, type de
   long/moyen-courrier, heures avant départ.
3. Outil : Google Colab (Python, `statsmodels`/`sklearn`) ou R `glm()` —
   pas besoin d'infra ML, juste un script ponctuel.
4. Résultat = quelques coefficients → équation à coder en dur dans
   `lib/boardingProbability.ts`, remplaçant l'heuristique actuelle.
5. Une fois l'app utilisée en réel, refitter périodiquement sur les données
   Supabase accumulées (`flights` + `flight_load_updates` + `bets` résolus),
   plus représentatives que le CSV AF/KLM historique.

## Décisions confirmées (à ne pas rouvrir sans y repenser)

1. P(embarque) affichée aux joueurs avant de parier.
2. Pronostic d'embarquement faux → 0 point (pas de malus, juste rien).
3. Crédit partiel sur les sièges (pas de tout-ou-rien).
4. Formule = `TimeMultiplier × (a·Board + b·Class + c·Seats)`, pas une
   simple somme de bonus indépendants.
5. Compagnies hors AF/KL/Transavia ("basic") : pas de modèle possible (pas
   de remplissage visible) → seul `TimeMultiplier × boardWeight × oddsTerm`
   avec P neutre (50%) s'applique, pas de classe/sièges (déjà la règle du
   jeu existante). Concrètement, `P = 50%` donne un `oddsTerm` **fixe** de 2
   (`1/0.5`), identique pour tous les paris "basic" corrects — aucune
   variation possible puisqu'il n'y a aucune donnée pour en créer. C'est
   donc déjà, par construction, le cas le plus "stable" du barème (pas
   besoin d'amortissement supplémentaire pour ce tier).
6. Amortissement temporaire de `P(embarque)` vers 50% pour le calcul des
   points (`SCORING_SHRINKAGE = 0.4`), tant que le modèle n'est pas calibré
   — voir section dédiée plus haut. Le plafond pratique actuel est donc
   plus bas que le plafond théorique de 100, volontairement.

## Ouvert / à trancher

- `oddsCap` (6) — à ajuster une fois qu'on voit des scores réels avec
  `SCORING_SHRINKAGE` desserré.
- Tolérance sièges (`seatsTolerance = 5`) — à revoir selon le ressenti.
- `PClass`/`PSeats` : attente des règles de surclassement exactes.
- Rythme de desserrage de `SCORING_SHRINKAGE` (0.4 aujourd'hui) — pas de
  règle définie sur quand/comment l'augmenter une fois le modèle validé.
- Faut-il republier des scores rétroactivement si le modèle change (ex:
  après un refit, ou après un changement de `SCORING_SHRINKAGE`) ? Pas
  tranché — probablement non, les points déjà distribués restent figés
  pour la stabilité du classement.
