import { POINTS, TIME_MULTIPLIER_TIERS, type MyIdTravelStatus } from './constants';
import { computePBoardForScoring, CLASS_PROBABILITY } from './boardingProbability';
import type { TicketType, DataTier, SeatsByCabin } from './difficulty';

type Bet = {
  user_id: string;
  predicted_boarded: boolean;
  predicted_class: string | null;
  predicted_seats_remaining: number | null;
  placed_at: string;
  edit_count: number;
};

type ResolvedFlight = {
  created_by: string;
  ticket_type: TicketType | null;
  data_tier: DataTier;
  scheduled_departure: string;
  actual_boarded: boolean;
  actual_class: string | null;
  actual_seats_remaining: number | null;
};

// Dernier remplissage connu au moment précis du pari (PAS le résultat
// final) — reconstruit à partir de l'historique flight_load_updates,
// filtré aux constats antérieurs ou égaux à bet.placed_at. `null` si aucun
// constat n'existait encore à ce moment-là.
export type LoadSnapshotAtBetTime = {
  seats_by_cabin: SeatsByCabin | null;
  r1_count: number | null;
  myidtravel_status: MyIdTravelStatus | null;
} | null;

// Reconstruit ce qui était connu au moment précis d'un pari (pas le
// résultat final) à partir de l'historique complet flight_load_updates,
// trié du plus ancien au plus récent. Partagé entre la résolution du vol
// (calcul des points) et l'affichage du détail sur la page du vol.
export function findLoadAsOf(
  loadHistory: {
    recorded_at: string;
    seats_by_cabin: SeatsByCabin | null;
    r1_count: number | null;
    myidtravel_status?: MyIdTravelStatus | null;
  }[],
  placedAt: string
): LoadSnapshotAtBetTime {
  const candidates = loadHistory.filter((l) => l.recorded_at <= placedAt);
  if (candidates.length === 0) return null;
  const latest = candidates[candidates.length - 1];
  return {
    seats_by_cabin: latest.seats_by_cabin,
    r1_count: latest.r1_count,
    myidtravel_status: latest.myidtravel_status ?? null,
  };
}

// Détail du calcul, pour affichage aux joueurs une fois le vol résolu (voir
// SCORING.md). Reproduit exactement les étapes de computeBetPoints.
export type BetPointsBreakdown = {
  boardedCorrect: boolean;
  outcomeProbability: number | null; // P(issue réelle) utilisée pour la cote, amortie (null si pari faux)
  boardTerm: number; // 0 si pari faux
  classCorrect: boolean | null; // null si la classe n'a pas pu être évaluée (pas embarqué, ou rien prédit)
  classTerm: number;
  seatsDiff: number | null; // écart absolu prédit/réel, null si non évalué
  seatsTerm: number;
  timeMultiplier: number;
  bracketBeforePenalty: number; // TimeMultiplier x (a.Board + b.Class + c.Seats), avant pénalité de modif
  editCount: number;
  editPenaltyFactor: number; // (1 - betChangePenaltyPerEdit) ^ editCount
  finalPoints: number;
};

function getTimeMultiplier(placedAt: Date, departure: Date): number {
  const daysBefore = (departure.getTime() - placedAt.getTime()) / (1000 * 60 * 60 * 24);
  for (const tier of TIME_MULTIPLIER_TIERS) {
    if (daysBefore >= tier.minDays) return tier.multiplier;
  }
  return 1;
}

// BoardOddsTerm = 1/P(issue réellement arrivée), plafonné (voir POINTS.oddsCap
// et SCORING.md — "P(board) comme des cotes").
function oddsTerm(p: number): number {
  return Math.min(POINTS.oddsCap, Math.max(1, 1 / p));
}

export function computeBetPointsBreakdown(
  bet: Bet,
  flight: ResolvedFlight,
  posterSeniorityDate: Date | string | null,
  loadAtBetTime: LoadSnapshotAtBetTime
): BetPointsBreakdown {
  const placedAt = new Date(bet.placed_at);
  const departure = new Date(flight.scheduled_departure);
  const timeMultiplier = getTimeMultiplier(placedAt, departure);
  const editPenaltyFactor = Math.pow(1 - POINTS.betChangePenaltyPerEdit, bet.edit_count ?? 0);

  // Pari perdu sur l'embarquement : 0 point, quoi qu'il arrive sur la
  // classe ou les sièges (règle confirmée).
  const boardedCorrect = bet.predicted_boarded === flight.actual_boarded;
  if (!boardedCorrect) {
    return {
      boardedCorrect: false,
      outcomeProbability: null,
      boardTerm: 0,
      classCorrect: null,
      classTerm: 0,
      seatsDiff: null,
      seatsTerm: 0,
      timeMultiplier,
      bracketBeforePenalty: 0,
      editCount: bet.edit_count ?? 0,
      editPenaltyFactor,
      finalPoints: 0,
    };
  }

  // Version "amortie" de P(embarque) pour le calcul des points — pas la
  // valeur brute affichée aux joueurs (voir computePBoardForScoring).
  const pBoard = computePBoardForScoring({
    ticketType: flight.ticket_type,
    dataTier: flight.data_tier,
    seatsByCabin: loadAtBetTime?.seats_by_cabin ?? null,
    r1Count: loadAtBetTime?.r1_count ?? null,
    myIdTravelStatus: loadAtBetTime?.myidtravel_status ?? null,
    posterSeniorityDate,
    scheduledDeparture: departure,
    atTime: placedAt,
  });
  // Le pari était juste : la probabilité de CETTE issue est PBoard s'il a
  // parié "embarque", ou son complément s'il a parié "n'embarque pas".
  const outcomeProbability = bet.predicted_boarded ? pBoard : 1 - pBoard;
  const boardTerm = oddsTerm(outcomeProbability);

  // P(classe) reste fixe à 1/3 (voir CLASS_PROBABILITY) : ne rapporte que si
  // la classe devinée est correcte, jamais de malus.
  let classCorrect: boolean | null = null;
  let classTerm = 0;
  if (flight.actual_boarded && bet.predicted_class && flight.actual_class) {
    classCorrect = bet.predicted_class === flight.actual_class;
    classTerm = classCorrect ? oddsTerm(CLASS_PROBABILITY) : 0;
  }

  let seatsDiff: number | null = null;
  let seatsTerm = 0;
  if (
    flight.actual_boarded &&
    bet.predicted_seats_remaining != null &&
    flight.actual_seats_remaining != null
  ) {
    seatsDiff = Math.abs(bet.predicted_seats_remaining - flight.actual_seats_remaining);
    seatsTerm = Math.max(0, 1 - seatsDiff / POINTS.seatsTolerance);
  }

  const bracketBeforePenalty =
    timeMultiplier *
    (POINTS.boardWeight * boardTerm + POINTS.classWeight * classTerm + POINTS.seatsWeight * seatsTerm);

  return {
    boardedCorrect: true,
    outcomeProbability,
    boardTerm,
    classCorrect,
    classTerm,
    seatsDiff,
    seatsTerm,
    timeMultiplier,
    bracketBeforePenalty,
    editCount: bet.edit_count ?? 0,
    editPenaltyFactor,
    finalPoints: Math.round(bracketBeforePenalty * editPenaltyFactor),
  };
}

export function computeBetPoints(
  bet: Bet,
  flight: ResolvedFlight,
  posterSeniorityDate: Date | string | null,
  loadAtBetTime: LoadSnapshotAtBetTime
): number {
  return computeBetPointsBreakdown(bet, flight, posterSeniorityDate, loadAtBetTime).finalPoints;
}
