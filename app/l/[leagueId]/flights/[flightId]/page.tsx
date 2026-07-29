import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSupabase } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/currentUser';
import { requireLeagueMembership } from '@/lib/leagueAccess';
import { getFlightPhase, FLIGHT_PHASE_LABELS } from '@/lib/flightPhase';
import { computePBoard } from '@/lib/boardingProbability';
import { computeBetPointsBreakdown, findLoadAsOf, type BetPointsBreakdown } from '@/lib/points';
import type { TicketType, DataTier } from '@/lib/difficulty';
import { TICKET_TYPES } from '@/lib/constants';
import BetPanel from '@/components/BetPanel';
import ResolvePanel from '@/components/ResolvePanel';
import LoadUpdateForm from '@/components/LoadUpdateForm';
import DeleteFlightButton from '@/components/DeleteFlightButton';
import PBoardSparkline from '@/components/PBoardSparkline';
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
    .select('*, profiles!flights_created_by_fkey(pseudo, seniority_date)')
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

  // "Cote" actuelle, visible avant de parier (voir SCORING.md) — estimation
  // best-guess, pas encore un modèle fitté sur des données réelles.
  const pBoardNow =
    flight.status !== 'resolved'
      ? computePBoard({
          ticketType: flight.ticket_type as TicketType | null,
          dataTier: flight.data_tier as DataTier,
          seatsByCabin: latestLoad?.seats_by_cabin ?? null,
          r1Count: latestLoad?.r1_count ?? null,
          posterSeniorityDate: flight.profiles?.seniority_date ?? null,
          scheduledDeparture: flight.scheduled_departure,
          atTime: new Date(),
        })
      : null;

  // Évolution de P(embarque) : un point par constat de remplissage, avec la
  // valeur brute (non amortie) — même logique que "cote actuelle" ci-dessus,
  // évaluée à chaque instant historique plutôt qu'à l'instant présent.
  const pBoardHistory = (loadUpdates ?? []).map((u: any) => ({
    recordedAt: u.recorded_at,
    pBoardPct:
      computePBoard({
        ticketType: flight.ticket_type as TicketType | null,
        dataTier: flight.data_tier as DataTier,
        seatsByCabin: u.seats_by_cabin ?? null,
        r1Count: u.r1_count ?? null,
        posterSeniorityDate: flight.profiles?.seniority_date ?? null,
        scheduledDeparture: flight.scheduled_departure,
        atTime: new Date(u.recorded_at),
      }) * 100,
  }));

  // Consensus des joueurs : % de pronostics "embarque" (même calcul que
  // ConsensusBar, pour l'afficher juste à côté de la cote du modèle).
  const consensusPct =
    bets && bets.length > 0
      ? Math.round((bets.filter((b: any) => b.predicted_boarded).length / bets.length) * 100)
      : null;

  // Détail du calcul des points, une fois le vol résolu (voir SCORING.md).
  const breakdowns: Record<string, BetPointsBreakdown> = {};
  if (flight.status === 'resolved') {
    const resolvedFlightContext = {
      created_by: flight.created_by,
      ticket_type: flight.ticket_type as TicketType | null,
      data_tier: flight.data_tier as DataTier,
      scheduled_departure: flight.scheduled_departure,
      actual_boarded: flight.actual_boarded as boolean,
      actual_class: flight.actual_class,
      actual_seats_remaining: flight.actual_seats_remaining,
    };
    for (const b of bets ?? []) {
      breakdowns[b.id] = computeBetPointsBreakdown(
        b,
        resolvedFlightContext,
        flight.profiles?.seniority_date ?? null,
        findLoadAsOf((loadUpdates ?? []) as any, b.placed_at)
      );
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href={`/l/${league.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-amber"
      >
        ← Tableau des vols
      </Link>
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

      {phase === 'open' && <BetPanel flightId={flight.id} existingBet={myBet} />}

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
        <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-wide text-text-muted">
          <span>
            {FLIGHT_PHASE_LABELS[phase]}
            {isCreator && phase !== 'awaiting_result' && phase !== 'resolved' && (
              <span className="ml-2 font-normal normal-case">
                (tu pourras renseigner le résultat une fois le vol décollé)
              </span>
            )}
          </span>
          {isCreator && <DeleteFlightButton flightId={flight.id} leagueId={league.id} />}
        </div>
      )}

      {isCreator && phase === 'awaiting_result' && <ResolvePanel flightId={flight.id} />}

      {latestLoad?.seats_by_cabin && Object.keys(latestLoad.seats_by_cabin).length > 0 && (
        <div className="mb-6 rounded-lg border-2 border-teal/60 bg-navy-panel p-4">
          <p className="mb-1 text-sm font-semibold text-text-primary">Dernier remplissage connu</p>
          <p className="mb-3 text-xs text-text-muted">
            {new Date(latestLoad.recorded_at).toLocaleString('fr-FR')}
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-text-muted">
                <th className="pb-1 font-normal">Cabine</th>
                <th className="pb-1 font-normal">Vendus</th>
                <th className="pb-1 font-normal">Restants</th>
                <th className="pb-1 font-normal">PAD</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(
                latestLoad.seats_by_cabin as Record<string, { sold: number; capacity: number; pad?: number }>
              ).map(([cabin, load]) => (
                <tr key={cabin} className="border-t border-navy-line">
                  <td className="py-1.5 text-text-primary">{cabin}</td>
                  <td className="py-1.5 font-mono text-text-muted">
                    {load.sold}/{load.capacity}
                  </td>
                  <td className="py-1.5 font-mono text-lg font-semibold text-teal">
                    {Math.max(0, load.capacity - load.sold)}
                  </td>
                  <td className="py-1.5 font-mono text-text-muted">{load.pad ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {latestLoad.r1_count != null && (
            <p className="mt-2 text-xs text-text-muted">
              R1 sur ce vol : <span className="font-semibold text-text-primary">{latestLoad.r1_count}</span>
            </p>
          )}
        </div>
      )}

      {pBoardNow != null && (phase === 'open' || phase === 'betting_closed') && (
        <div className="mb-6 rounded-lg border border-teal/40 bg-navy-panel p-4">
          <p className="mb-2 text-sm font-medium text-text-primary">
            Évolution de la probabilité d&apos;embarquement
          </p>
          <PBoardSparkline points={pBoardHistory} />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-md bg-navy px-3 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-text-muted">Cote (modèle)</p>
              <p className="text-xl font-semibold text-teal">{Math.round(pBoardNow * 100)}%</p>
            </div>
            <div className="rounded-md bg-navy px-3 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-text-muted">Consensus joueurs</p>
              <p className="text-xl font-semibold text-amber">
                {consensusPct != null ? `${consensusPct}%` : '—'}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Estimation provisoire (sièges restants, PAD, ancienneté, temps restant) — sera
            affinée avec un vrai modèle une fois assez de données collectées.
          </p>
        </div>
      )}

      {flight.data_tier === 'rich' && flight.status !== 'resolved' && (
        <LoadUpdateForm flightId={flight.id} />
      )}

      <div className="mb-6 rounded-lg border border-navy-line bg-navy-panel p-4">
        <p className="mb-2 text-sm font-medium text-text-primary">Sagesse collective</p>
        <ConsensusBar bets={bets ?? []} />
      </div>

      <h2 className="mb-2 mt-8 font-display text-lg text-text-primary">
        Pronostics ({(bets ?? []).length})
      </h2>
      <ul className="divide-y divide-navy-line rounded-lg border border-navy-line bg-navy-panel">
        {(bets ?? []).map((b: any) => {
          const bd = breakdowns[b.id];
          return (
            <li key={b.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-text-primary">{b.profiles?.pseudo ?? '?'}</span>
                <span className="text-text-muted">
                  {b.predicted_boarded
                    ? `Embarque${b.predicted_class ? ' · ' + b.predicted_class : ''}`
                    : "N'embarque pas"}
                  {b.edit_count > 0 ? ` (modifié ${b.edit_count}x)` : ''}
                  {b.points_awarded != null ? ` · ${b.points_awarded} pts` : ''}
                </span>
              </div>
              {bd && (
                <div className="mt-1.5 space-y-0.5 text-xs text-text-muted">
                  {!bd.boardedCorrect ? (
                    <p>Pronostic d&apos;embarquement faux → 0 pt</p>
                  ) : (
                    <>
                      <p>
                        Embarquement correct (P utilisée : {Math.round((bd.outcomeProbability ?? 0) * 100)}%)
                        → cote ×{bd.boardTerm.toFixed(2)}
                      </p>
                      {bd.classCorrect != null && (
                        <p>
                          Classe {bd.classCorrect ? 'correcte' : 'incorrecte'} (P fixe 33%)
                          {bd.classCorrect ? ` → cote ×${bd.classTerm.toFixed(2)}` : ' → 0 pt'}
                        </p>
                      )}
                      {bd.seatsDiff != null && (
                        <p>
                          Sièges : écart de {bd.seatsDiff} → crédit {Math.round(bd.seatsTerm * 100)}%
                        </p>
                      )}
                      <p>Multiplicateur temporel (délai avant décollage) : ×{bd.timeMultiplier}</p>
                      {bd.editCount > 0 && (
                        <p>
                          Pénalité modification ({bd.editCount}x) : ×{bd.editPenaltyFactor.toFixed(2)}
                        </p>
                      )}
                      <p className="text-text-primary">= {bd.finalPoints} pts</p>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {(bets ?? []).length === 0 && (
          <li className="px-4 py-6 text-center text-text-muted">Aucun pronostic pour l&apos;instant.</li>
        )}
      </ul>
    </main>
  );
}
