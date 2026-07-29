// Estimation de P(embarque) — "meilleure estimation" en attendant un vrai
// modèle statistique fitté sur des données réelles (voir SCORING.md pour le
// plan complet : collecte de données, formule cible, constantes à retenir).
//
// Combine : sièges restants dans la cabine pertinente, nombre de standby en
// attente (PAD) pondéré par le rang estimé du posteur dans cette file (via
// son ancienneté), nombre de R1 (priorité absolue devant les R2, réduit donc
// les sièges disponibles), et le temps restant avant le décollage (plus loin
// dans le temps, plus l'estimation reste prudente/proche de 50%, puisque le
// remplissage peut encore beaucoup bouger).
//
// Toutes les constantes ci-dessous sont des hypothèses de départ, pas des
// valeurs calibrées — à remplacer une fois le modèle réel disponible.

import { getRelevantCabins, remainingSeats, type SeatsByCabin, type TicketType, type DataTier } from './difficulty';

// --- Ancienneté -> position estimée dans la file d'attente PAD ---
// 30 ans d'ancienneté ou plus = en tête de file (percentile 0 = meilleur).
// 0 an d'ancienneté = ~80% de la file devant soi (percentile 80).
// Variation linéaire entre les deux (cf. discussion : "30 ans = numéro 1,
// 0 an = 80% en dessous").
export const SENIORITY_TOP_YEARS = 30;
export const SENIORITY_ZERO_PERCENTILE = 80;

export function seniorityPercentile(seniorityDate: Date | string | null | undefined): number {
  if (!seniorityDate) return SENIORITY_ZERO_PERCENTILE;
  const years = (Date.now() - new Date(seniorityDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const clampedYears = Math.max(0, Math.min(SENIORITY_TOP_YEARS, years));
  return SENIORITY_ZERO_PERCENTILE * (1 - clampedYears / SENIORITY_TOP_YEARS);
}

// Probabilité neutre utilisée quand on n'a aucune visibilité (compagnie
// "basic", ou vol "rich" dont le remplissage n'a jamais été renseigné).
export const NO_DATA_PBOARD = 0.5;

// Le modèle ne renvoie jamais une certitude absolue : on garde une marge
// d'humilité même dans les cas extrêmes.
const MIN_PROBABILITY = 0.05;
const MAX_PROBABILITY = 0.95;

// --- Seuil de marge nécessaire pour un 50/50, en fonction du temps restant ---
// À 1 mois (720h) du décollage, il faut une marge de 30% de la capacité de
// la cabine pertinente au-delà du rang estimé pour être à 50/50 (le
// remplissage peut encore beaucoup bouger d'ici le départ). Ce seuil
// diminue linéairement jusqu'à 0% le jour du décollage (la situation est
// alors figée : être pile à son rang suffit pour un 50/50).
export const REQUIRED_BUFFER_FRACTION_AT_1_MONTH = 0.3;
export const BUFFER_HORIZON_HOURS = 30 * 24; // 1 mois

// Pente linéaire : de combien un écart par rapport au seuil (exprimé en %
// de la capacité de la cabine) fait varier la probabilité autour de 50%.
// Calibré pour qu'un écart de ±50% de la capacité atteigne les bornes
// [5%, 95%] ci-dessus.
export const PROBABILITY_SLOPE = 0.9;

function requiredBufferFraction(hoursLeft: number): number {
  const t = Math.max(0, Math.min(1, hoursLeft / BUFFER_HORIZON_HOURS));
  return REQUIRED_BUFFER_FRACTION_AT_1_MONTH * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computePBoard({
  ticketType,
  dataTier,
  seatsByCabin,
  r1Count,
  posterSeniorityDate,
  scheduledDeparture,
  atTime,
}: {
  ticketType: TicketType | null;
  dataTier: DataTier;
  seatsByCabin: SeatsByCabin | null | undefined;
  r1Count: number | null | undefined;
  posterSeniorityDate: Date | string | null | undefined;
  scheduledDeparture: Date | string;
  atTime: Date;
}): number {
  if (dataTier !== 'rich' || !seatsByCabin) {
    return NO_DATA_PBOARD;
  }

  const cabins = getRelevantCabins(ticketType);
  let seatsLeft = 0;
  let pad = 0;
  let hasData = false;
  for (const cabin of cabins) {
    const load = seatsByCabin[cabin];
    if (load && load.capacity > 0) hasData = true;
    seatsLeft += remainingSeats(load);
    pad += load?.pad ?? 0;
  }
  if (!hasData) return NO_DATA_PBOARD;

  // Les R1 embarquent avant tout R2 : on retire leur nombre des sièges
  // disponibles avant de raisonner sur la file R2.
  const seatsAfterR1 = Math.max(0, seatsLeft - (r1Count ?? 0));

  const pct = seniorityPercentile(posterSeniorityDate); // 0-80
  const estimatedRank = (pct / 100) * pad;
  const margin = seatsAfterR1 - estimatedRank; // sièges disponibles au-delà de son rang estimé

  const totalCapacity = cabins.reduce((sum, cabin) => sum + (seatsByCabin[cabin]?.capacity ?? 0), 0);
  const hoursLeft = Math.max(
    0,
    (new Date(scheduledDeparture).getTime() - atTime.getTime()) / (1000 * 60 * 60)
  );
  const requiredBuffer = requiredBufferFraction(hoursLeft) * totalCapacity;
  const bufferGapFraction = totalCapacity > 0 ? (margin - requiredBuffer) / totalCapacity : 0;

  const p = 0.5 + bufferGapFraction * PROBABILITY_SLOPE;
  return clamp(p, MIN_PROBABILITY, MAX_PROBABILITY);
}

// --- Amortissement temporaire pour le calcul des points ---
// computePBoard() n'est encore qu'une heuristique, pas un modèle fitté sur
// des données réelles (voir SCORING.md). Tant qu'il n'est pas validé, on ne
// veut pas qu'il fasse varier les scores autant qu'une estimation de
// confiance. On resserre donc la probabilité utilisée POUR LE CALCUL DES
// POINTS vers 50% d'un facteur SCORING_SHRINKAGE, sans toucher à la valeur
// affichée aux joueurs (computePBoard reste la "cote" honnête montrée avant
// le pari). À desserrer (rapprocher de 1) une fois le modèle calibré sur de
// vraies données ; SCORING_SHRINKAGE = 1 reviendrait à ne plus amortir du tout.
export const SCORING_SHRINKAGE = 0.4;

export function computePBoardForScoring(args: Parameters<typeof computePBoard>[0]): number {
  const raw = computePBoard(args);
  return 0.5 + (raw - 0.5) * SCORING_SHRINKAGE;
}

// P(classe) reste fixe à 1/3 (3 cabines possibles), quelle que soit la
// situation — pas de modélisation par cabine pour l'instant (voir
// SCORING.md, en attente des règles de surclassement exactes). Toujours
// utilisée en mode "cote" : ne rapporte que si la classe devinée est
// correcte, jamais de malus.
export const CLASS_PROBABILITY = 1 / 3;
