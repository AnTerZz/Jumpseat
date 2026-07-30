import Link from 'next/link';
import SplitFlap from './SplitFlap';
import { getFlightPhase, FLIGHT_PHASE_LABELS } from '@/lib/flightPhase';
import { formatFlightDate, formatFlightTime } from '@/lib/dateFormat';

export default function FlightBoardRow({
  flight,
  leagueId,
  hasBet,
}: {
  flight: any;
  leagueId: string;
  hasBet: boolean;
}) {
  const dateLabel = formatFlightDate(flight.scheduled_departure);
  const timeLabel = formatFlightTime(flight.scheduled_departure);

  const phase = getFlightPhase(flight);
  const statusLabel =
    phase === 'resolved' ? (flight.actual_boarded ? 'EMBARQUE' : 'REFUSE') : FLIGHT_PHASE_LABELS[phase];

  const statusColor =
    phase === 'resolved'
      ? flight.actual_boarded
        ? 'text-boarded'
        : 'text-denied'
      : phase === 'open'
        ? 'text-amber'
        : phase === 'betting_closed'
          ? 'text-teal'
          : 'text-text-muted';

  return (
    <Link
      href={`/l/${leagueId}/flights/${flight.id}`}
      className="grid grid-cols-[1fr_1.2fr_1fr_auto] items-center gap-4 border-b border-navy-line px-4 py-3 last:border-b-0 hover:bg-white/5"
    >
      <span className="flex items-center gap-2 font-mono text-text-primary">
        <span
          title={hasBet ? 'Pronostic déjà placé' : 'Nouveau : pas encore de pronostic'}
          className={`h-2 w-2 shrink-0 rounded-full ${hasBet ? 'bg-teal' : 'bg-amber'}`}
        />
        {flight.flight_number}
      </span>
      <span className="text-text-primary">
        {flight.origin ?? '?'} → {flight.destination ?? '?'}
      </span>
      <span className="text-text-muted">
        {dateLabel} · {timeLabel}
      </span>
      <span className={`text-xs font-semibold ${statusColor}`}>
        <SplitFlap value={statusLabel} />
      </span>
    </Link>
  );
}
