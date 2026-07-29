// Indice de difficulté indicatif, de 1 (issue assez prévisible) à 5 (très
// incertain). Volontairement transparent/simple — à affiner une fois qu'on
// aura testé avec de vrais vols (cf. discussion sur le barème de points).
//
// Facteurs pris en compte, comme discuté :
// - type de billet R2 + niveau d'info de la compagnie (rich/basic)
// - vacances scolaires ou non à la date du vol
// - ancienneté du voyageur (seniority_date)
// - temps restant avant le départ au moment du constat
// - dernier remplissage connu (si disponible)
//
// Facteurs évoqués mais PAS encore intégrés (à ajouter plus tard si besoin,
// voir BACKLOG.md) : jour de semaine/heure de vol, saison haute/basse hors
// vacances scolaires, taille de l'appareil — ces deux derniers demanderaient
// un référentiel supplémentaire (capacité par type d'appareil) qu'on n'a pas
// encore.

import { RICH_TIER_AIRLINE_CODES } from './constants';
import { isSchoolHoliday } from './schoolHolidays';

export type TicketType = 'r2_eco' | 'r2_premium' | 'r2_business' | 'r2s';
export type DataTier = 'rich' | 'basic';

// Un constat de remplissage donne les sièges vendus et la capacité totale
// par cabine ; le nombre de sièges restants s'en déduit (voir `remainingSeats`).
// `pad` (nombre de standby en attente sur cette cabine) est collecté pour
// estimer le pool de concurrents, mais n'entre pas encore dans le calcul de
// difficulté ci-dessous — réservé pour le futur modèle de probabilité.
export type CabinLoad = { sold: number; capacity: number; pad?: number };
export type SeatsByCabin = Record<string, CabinLoad>;

export function getDataTier(airlineCode: string | null | undefined): DataTier {
  if (!airlineCode) return 'basic';
  return RICH_TIER_AIRLINE_CODES.includes(airlineCode.toUpperCase()) ? 'rich' : 'basic';
}

export function remainingSeats(load: CabinLoad | undefined): number {
  if (!load) return 0;
  return Math.max(0, (load.capacity ?? 0) - (load.sold ?? 0));
}

// Cabine(s) à surveiller selon le type de billet, réutilisé par le calcul de
// difficulté ci-dessous ET par lib/boardingProbability.ts (voir SCORING.md).
export function getRelevantCabins(ticketType: TicketType | null): string[] {
  switch (ticketType) {
    case 'r2_business':
      return ['Business'];
    case 'r2_premium':
      return ['Premium Economy'];
    case 'r2s':
      return ['Business', 'Premium Economy'];
    case 'r2_eco':
    default:
      return ['Economy'];
  }
}

function getUpgradePoolSeats(seatsByCabin: SeatsByCabin): number {
  return remainingSeats(seatsByCabin['Business']) + remainingSeats(seatsByCabin['Premium Economy']);
}

function getRelevantSeatsRemaining(
  ticketType: TicketType | null,
  seatsByCabin: SeatsByCabin | null | undefined
): number | null {
  if (!seatsByCabin) return null;
  switch (ticketType) {
    case 'r2_business':
      return remainingSeats(seatsByCabin['Business']);
    case 'r2_premium':
      return remainingSeats(seatsByCabin['Premium Economy']);
    case 'r2s':
      return getUpgradePoolSeats(seatsByCabin);
    case 'r2_eco':
    default:
      return remainingSeats(seatsByCabin['Economy']);
  }
}

export function computeDifficulty({
  ticketType,
  dataTier,
  scheduledDeparture,
  recordedAt = new Date(),
  seniorityDate,
  seatsByCabin,
}: {
  ticketType: TicketType | null;
  dataTier: DataTier;
  scheduledDeparture: Date | string;
  recordedAt?: Date;
  seniorityDate?: Date | string | null;
  seatsByCabin?: SeatsByCabin | null;
}): number {
  // Base selon le type de billet / niveau d'info compagnie.
  let score: number;
  if (dataTier === 'basic') {
    // Pas de visibilité sur le remplissage, mais surclassement très rare :
    // plutôt prévisible dans l'ensemble.
    score = 2;
  } else {
    switch (ticketType) {
      case 'r2_business':
      case 'r2_premium':
        score = 2; // prioritaire sur sa cabine si de la place : assez déductible
        break;
      case 'r2s':
        score = 3; // cascade depuis le haut de gamme : un peu plus incertain
        break;
      case 'r2_eco':
      default:
        score = 4; // surclassement rare et imprévisible : le plus incertain
    }
  }

  // Vacances scolaires : plus de compétition sur la liste d'attente.
  const departure = new Date(scheduledDeparture);
  if (isSchoolHoliday(departure)) {
    score += 0.5;
  }

  // Ancienneté : moins ancien que la moyenne = un peu plus dur (on n'a pas
  // de visibilité sur la liste d'attente des autres, donc c'est un proxy
  // volontairement grossier).
  if (seniorityDate) {
    const years = (Date.now() - new Date(seniorityDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (years < 2) score += 0.5;
    else if (years > 10) score -= 0.5;
  }

  // Temps restant avant le départ au moment du constat : loin du départ,
  // encore beaucoup d'incertitude sur le remplissage final ; proche du
  // départ, la situation s'est en général stabilisée.
  const daysRemaining = (departure.getTime() - recordedAt.getTime()) / (24 * 60 * 60 * 1000);
  if (daysRemaining > 7) score += 0.5;
  else if (daysRemaining < 1) score -= 0.5;

  // Remplissage constaté (seulement si on a la donnée, cabines "rich").
  if (dataTier === 'rich') {
    const relevantSeats = getRelevantSeatsRemaining(ticketType, seatsByCabin);
    if (relevantSeats != null) {
      if (relevantSeats <= 2) score += 1;
      else if (relevantSeats <= 5) score += 0.5;
      else if (relevantSeats > 10) score -= 0.5;
    }
  }

  return Math.min(5, Math.max(1, Math.round(score * 10) / 10));
}
