// Les 4 états d'un vol, dérivés des horodatages déjà en base — pas besoin
// de champ supplémentaire pour "ouvert" / "paris clos" / "en attente".

export type FlightPhase = 'open' | 'betting_closed' | 'awaiting_result' | 'resolved';

const BETTING_CUTOFF_MS = 60 * 60 * 1000; // H-1h

export function getFlightPhase(flight: {
  status: string;
  scheduled_departure: string;
}): FlightPhase {
  if (flight.status === 'resolved') return 'resolved';

  const departure = new Date(flight.scheduled_departure).getTime();
  const now = Date.now();

  if (now < departure - BETTING_CUTOFF_MS) return 'open';
  if (now < departure) return 'betting_closed';
  return 'awaiting_result';
}

export const FLIGHT_PHASE_LABELS: Record<FlightPhase, string> = {
  open: 'OUVERT',
  betting_closed: 'PARIS CLOS',
  awaiting_result: 'EN ATTENTE',
  resolved: 'RESOLU', // écrasé par EMBARQUE/REFUSE dans l'UI une fois résolu
};

export function canPlaceBet(flight: { status: string; scheduled_departure: string }): boolean {
  return getFlightPhase(flight) === 'open';
}

export function isAtLeast24hOut(scheduledDeparture: string | Date): boolean {
  const departure = new Date(scheduledDeparture).getTime();
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  return departure - Date.now() >= TWO_HOURS_MS;
}
