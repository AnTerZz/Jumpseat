import { notFound, redirect } from 'next/navigation';
import { getSupabase } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/currentUser';
import { requireLeagueMembership } from '@/lib/leagueAccess';
import { getFlightPhase, FLIGHT_PHASE_LABELS } from '@/lib/flightPhase';
import { TICKET_TYPES } from '@/lib/constants';
import BetPanel from '@/components/BetPanel';
import ResolvePanel from '@/components/ResolvePanel';
import LoadUpdateForm from '@/components/LoadUpdateForm';
import DeleteFlightButton from '@/components/DeleteFlightButton';
import DifficultySparkline from '@/components/DifficultySparkline';
import ConsensusBar from '@/components/ConsensusBar';

export default async function FlightPage({
  params,
}: {
  params: { leagueId: string; flightId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { league } = await requireLeagueMembership(params.leagueId, user.id);

  const supabase = getSupabase();
  const { data: flight } = await supabase
    .from('flights')
    .select('*, profiles!flights_created_by_fkey(pseudo)')
    .eq('id', params.flightId)
    .eq('league_id', league.id)
    .maybeSingle();

  if (!flight) notFound();

  const { data: bets } = await supabase
    .from('bets')
    .select('*, profiles(pseudo)')
    .eq('flight_id', flight.id)
    .order('placed_at', { ascending: true });

  const { data: loadUpdates } = await supabase
    .from('flight_load_updates')
    .select('*, profiles(pseudo)')
    .eq('flight_id', flight.id)
    .order('recorded_at', { ascending: true });

  const myBet = (bets ?? []).find((b: any) => b.user_id === user.id) ?? null;
  const phase = getFlightPhase(flight);
  const isCreator = user.id === flight.created_by;
  const ticketLabel = TICKET_TYPES.find((t) => t.value === flight.ticket_type)?.label;
  const latestLoad = loadUpdates && loadUpdates.length > 0 ? loadUpdates[loadUpdates.length - 1] : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <p className="mb-1 text-xs uppercase tracking-wide text-text-muted">
        Posté par {flight.profiles?.pseudo ?? '?'}
        {ticketLabel ? ` · ${ticketLabel}` : ''}
      </p>
      <h1 className="mb-4 font-mono text-3xl text-text-primary">{flight.flight_number}</h1>
      <p className="mb-1 text-text-primary">
        {flight.origin ?? '?'} → {flight.destination ?? '?'}
      </p>
      <p className="mb-6 text-text-muted">
        Départ : {new Date(flight.scheduled_departure).toLocaleString('fr-FR')} ·{' '}
        {flight.aircraft_type ?? 'appareil inconnu'}
      </p>

      {flight.status === 'resolved' ? (
        <div className="mb-6 rounded-lg border border-navy-line bg-navy-panel p-4">
          <p className="font-semibold text-text-primary">
            Résultat : {flight.actual_boarded ? 'Embarqué ✅' : 'Refusé ❌'}
            {flight.actual_boarded && flight.actual_class ? ` · Classe ${flight.actual_class}` : ''}
            {flight.actual_boarded && flight.actual_seats_remaining != null
              ? ` · ${flight.actual_seats_remaining} sièges restants`
              : ''}
          </p>
        </div>
      ) : (
        <p className="mb-6 text-sm font-semibold uppercase tracking-wide text-amber">
          {FLIGHT_PHASE_LABELS[phase]}
          {isCreator && phase !== 'awaiting_result' && phase !== 'resolved' && (
            <span className="ml-2 font-normal normal-case text-text-muted">
              (tu pourras renseigner le résultat une fois le vol décollé)
            </span>
          )}
        </p>
      )}

      {isCreator && flight.status !== 'resolved' && (
        <DeleteFlightButton flightId={flight.id} leagueId={league.id} />
      )}

      {isCreator && phase === 'awaiting_result' && <ResolvePanel flightId={flight.id} />}

      {phase === 'open' && <BetPanel flightId={flight.id} existingBet={myBet} />}

      {flight.data_tier === 'rich' && flight.status !== 'resolved' && (
        <LoadUpdateForm flightId={flight.id} />
      )}

      {loadUpdates && loadUpdates.length > 0 && (
        <div className="mb-6 rounded-lg border border-navy-line bg-navy-panel p-4">
          <p className="mb-2 text-sm font-medium text-text-primary">Évolution de la difficulté</p>
          <DifficultySparkline
            points={loadUpdates.map((u) => ({ recordedAt: u.recorded_at, difficulty: u.difficulty }))}
          />
          {latestLoad?.seats_by_cabin && Object.keys(latestLoad.seats_by_cabin).length > 0 && (
            <p className="mt-2 text-xs text-text-muted">
              Dernier remplissage connu ({new Date(latestLoad.recorded_at).toLocaleString('fr-FR')}) :{' '}
              {Object.entries(latestLoad.seats_by_cabin as Record<string, { sold: number; capacity: number }>)
                .map(
                  ([cabin, load]) =>
                    `${cabin} : ${load.sold}/${load.capacity} vendus (${Math.max(0, load.capacity - load.sold)} restants)`
                )
                .join(' · ')}
            </p>
          )}
        </div>
      )}

      {league.show_consensus && (
        <div className="mb-6 rounded-lg border border-navy-line bg-navy-panel p-4">
          <p className="mb-2 text-sm font-medium text-text-primary">Sagesse collective</p>
          <ConsensusBar bets={bets ?? []} />
        </div>
      )}

      <h2 className="mb-2 mt-8 font-display text-lg text-text-primary">
        Pronostics ({(bets ?? []).length})
      </h2>
      <ul className="divide-y divide-navy-line rounded-lg border border-navy-line bg-navy-panel">
        {(bets ?? []).map((b: any) => (
          <li key={b.id} className="flex items-center justify-between px-4 py-3">
            <span className="text-text-primary">{b.profiles?.pseudo ?? '?'}</span>
            <span className="text-text-muted">
              {b.predicted_boarded ? `Embarque${b.predicted_class ? ' · ' + b.predicted_class : ''}` : "N'embarque pas"}
              {b.points_awarded != null ? ` · ${b.points_awarded} pts` : ''}
            </span>
          </li>
        ))}
        {(bets ?? []).length === 0 && (
          <li className="px-4 py-6 text-center text-text-muted">Aucun pronostic pour l&apos;instant.</li>
        )}
      </ul>
    </main>
  );
}
