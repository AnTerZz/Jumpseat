import { POINTS, TIME_MULTIPLIER_TIERS } from './constants';

type Bet = {
  user_id: string;
  predicted_boarded: boolean;
  predicted_class: string | null;
  predicted_seats_remaining: number | null;
  placed_at: string;
};

type ResolvedFlight = {
  created_by: string;
  scheduled_departure: string;
  actual_boarded: boolean;
  actual_class: string | null;
  actual_seats_remaining: number | null;
};

function getTimeMultiplier(placedAt: Date, departure: Date): number {
  const daysBefore = (departure.getTime() - placedAt.getTime()) / (1000 * 60 * 60 * 24);
  for (const tier of TIME_MULTIPLIER_TIERS) {
    if (daysBefore >= tier.minDays) return tier.multiplier;
  }
  return 1;
}

export function computeBetPoints(bet: Bet, flight: ResolvedFlight): number {
  let base = 0;

  const boardedCorrect = bet.predicted_boarded === flight.actual_boarded;
  if (boardedCorrect) base += POINTS.boardedCorrect;

  if (flight.actual_boarded && boardedCorrect && bet.predicted_class && flight.actual_class) {
    if (bet.predicted_class === flight.actual_class) base += POINTS.classCorrect;
  }

  if (
    flight.actual_boarded &&
    bet.predicted_seats_remaining != null &&
    flight.actual_seats_remaining != null
  ) {
    const diff = Math.abs(bet.predicted_seats_remaining - flight.actual_seats_remaining);
    base += Math.max(0, POINTS.seatsMaxPoints - diff * POINTS.seatsPenaltyPerSeat);
  }

  const multiplier = getTimeMultiplier(new Date(bet.placed_at), new Date(flight.scheduled_departure));

  return Math.round(base * multiplier);
}
