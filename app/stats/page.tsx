import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/currentUser';
import { getSupabase } from '@/lib/supabaseServer';
import PointsTrendSparkline from '@/components/PointsTrendSparkline';
import PieChart from '@/components/PieChart';

export default async function StatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = getSupabase();

  // Tous les paris de la personne, toutes ligues confondues — "mes stats"
  // est une vue transversale, contrairement au classement qui reste par
  // ligue (voir app/l/[leagueId]/leaderboard/page.tsx).
  const { data: myBets } = await supabase
    .from('bets')
    .select('*, flights(id, flight_number, league_id, status, actual_boarded, actual_class, actual_seats_remaining, leagues(name))')
    .eq('user_id', user.id)
    .order('placed_at', { ascending: true });

  const bets = (myBets ?? []) as any[];
  const resolved = bets.filter((b) => b.flights?.status === 'resolved' && b.points_awarded != null);
  const pending = bets.filter((b) => b.flights?.status !== 'resolved');

  const totalPoints = resolved.reduce((sum, b) => sum + (b.points_awarded ?? 0), 0);

  const boardedCorrectCount = resolved.filter((b) => b.predicted_boarded === b.flights?.actual_boarded).length;
  const winRate = resolved.length > 0 ? Math.round((boardedCorrectCount / resolved.length) * 100) : null;

  const classEligible = resolved.filter(
    (b) => b.predicted_boarded && b.flights?.actual_boarded && b.predicted_class && b.flights?.actual_class
  );
  const classCorrectCount = classEligible.filter((b) => b.predicted_class === b.flights.actual_class).length;
  const classAccuracy = classEligible.length > 0 ? Math.round((classCorrectCount / classEligible.length) * 100) : null;

  const seatsEligible = resolved.filter(
    (b) =>
      b.predicted_boarded &&
      b.flights?.actual_boarded &&
      b.predicted_seats_remaining != null &&
      b.flights?.actual_seats_remaining != null
  );
  const avgSeatsDiff =
    seatsEligible.length > 0
      ? Math.round(
          (seatsEligible.reduce((sum, b) => sum + Math.abs(b.predicted_seats_remaining - b.flights.actual_seats_remaining), 0) /
            seatsEligible.length) *
            10
        ) / 10
      : null;

  // Points cumulés dans l'ordre des paris posés — donne une tendance de
  // fond même si chaque vol individuel rapporte peu.
  let cumulative = 0;
  const cumulativePoints = resolved.map((b) => {
    cumulative += b.points_awarded ?? 0;
    return cumulative;
  });

  // Répartition par ligue : où les points sont-ils gagnés.
  const byLeague = new Map<string, { name: string; points: number; bets: number }>();
  for (const b of bets) {
    const leagueId = b.flights?.league_id;
    if (!leagueId) continue;
    const cur = byLeague.get(leagueId) ?? { name: b.flights?.leagues?.name ?? '?', points: 0, bets: 0 };
    cur.bets += 1;
    cur.points += b.points_awarded ?? 0;
    byLeague.set(leagueId, cur);
  }
  const leagueBreakdown = Array.from(byLeague.values()).sort((a, b) => b.points - a.points);

  const outcomePie =
    resolved.length > 0
      ? [
          { label: 'Pronostic juste', value: boardedCorrectCount, color: '#3ECB7A' },
          { label: 'Pronostic faux', value: resolved.length - boardedCorrectCount, color: '#F2545B' },
        ]
      : [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 font-display text-2xl text-text-primary">Mes stats</h1>
      <p className="mb-6 text-sm text-text-muted">
        Ton historique de pronostics, toutes ligues confondues.
      </p>

      {bets.length === 0 ? (
        <p className="rounded-lg border border-navy-line bg-navy-panel px-4 py-8 text-center text-text-muted">
          Pas encore de pronostic posé — ça viendra !
        </p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-navy-line bg-navy-panel p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-text-muted">Points totaux</p>
              <p className="mt-1 text-2xl font-bold text-amber">{totalPoints}</p>
            </div>
            <div className="rounded-lg border border-navy-line bg-navy-panel p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-text-muted">Paris résolus</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{resolved.length}</p>
              {pending.length > 0 && (
                <p className="text-[10px] text-text-muted">+{pending.length} en attente</p>
              )}
            </div>
            <div className="rounded-lg border border-navy-line bg-navy-panel p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-text-muted">Taux de réussite</p>
              <p className="mt-1 text-2xl font-bold text-teal">{winRate != null ? `${winRate}%` : '—'}</p>
              <p className="text-[10px] text-text-muted">embarque / n&apos;embarque pas</p>
            </div>
            <div className="rounded-lg border border-navy-line bg-navy-panel p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-text-muted">Classe correcte</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">
                {classAccuracy != null ? `${classAccuracy}%` : '—'}
              </p>
              <p className="text-[10px] text-text-muted">
                {classEligible.length > 0 ? `sur ${classEligible.length} tentative(s)` : 'pas encore de donnée'}
              </p>
            </div>
          </div>

          {cumulativePoints.length >= 2 && (
            <div className="mb-6 rounded-lg border border-navy-line bg-navy-panel p-4">
              <p className="mb-2 text-sm font-medium text-text-primary">Évolution des points cumulés</p>
              <PointsTrendSparkline values={cumulativePoints} />
            </div>
          )}

          {outcomePie.length > 0 && (
            <div className="mb-6 rounded-lg border border-navy-line bg-navy-panel p-4">
              <p className="mb-3 text-sm font-medium text-text-primary">Embarquement : juste ou faux</p>
              <PieChart data={outcomePie} />
            </div>
          )}

          {avgSeatsDiff != null && (
            <p className="mb-6 text-xs text-text-muted">
              Écart moyen sur les sièges restants devinés :{' '}
              <span className="text-text-primary">{avgSeatsDiff}</span> (sur {seatsEligible.length} tentative(s))
            </p>
          )}

          <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-text-muted">Par ligue</h2>
          <ul className="overflow-hidden rounded-lg border border-navy-line bg-navy-panel">
            {leagueBreakdown.map((l) => (
              <li
                key={l.name}
                className="flex items-center justify-between border-b border-navy-line px-4 py-3 last:border-b-0"
              >
                <span className="text-text-primary">{l.name}</span>
                <span className="text-text-muted">
                  {l.bets} pari{l.bets > 1 ? 's' : ''} ·{' '}
                  <span className="font-mono text-amber">{l.points} pts</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
