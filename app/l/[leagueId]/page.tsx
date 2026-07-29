import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/currentUser';
import { getSupabase } from '@/lib/supabaseServer';
import { requireLeagueMembership } from '@/lib/leagueAccess';
import { getFlightPhase } from '@/lib/flightPhase';
import FlightBoardRow from '@/components/FlightBoardRow';

export default async function LeagueDashboardPage({ params }: { params: { leagueId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { league } = await requireLeagueMembership(params.leagueId, user.id);

  const supabase = getSupabase();
  const { data: flights } = await supabase
    .from('flights')
    .select('*, profiles!flights_created_by_fkey(pseudo)')
    .eq('league_id', league.id)
    .order('scheduled_departure', { ascending: false });

  const all = flights ?? [];
  const upcoming = all
    .filter((f: any) => getFlightPhase(f) === 'open' || getFlightPhase(f) === 'betting_closed')
    .sort((a: any, b: any) => a.scheduled_departure.localeCompare(b.scheduled_departure));
  const past = all.filter((f: any) => getFlightPhase(f) === 'awaiting_result' || getFlightPhase(f) === 'resolved');

  const departingSoon = upcoming.filter((f: any) => {
    const msUntilDeparture = new Date(f.scheduled_departure).getTime() - Date.now();
    return msUntilDeparture > 0 && msUntilDeparture <= 24 * 60 * 60 * 1000;
  });

  const flightIds = all.map((f: any) => f.id);
  const { data: myBets } =
    flightIds.length > 0
      ? await supabase.from('bets').select('flight_id').eq('user_id', user.id).in('flight_id', flightIds)
      : { data: [] as { flight_id: string }[] };
  const bettedFlightIds = new Set((myBets ?? []).map((b: any) => b.flight_id));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">{league.name}</p>
          <h1 className="font-display text-2xl text-text-primary">Tableau des vols</h1>
          <p className="mt-1 text-xs text-text-muted">
            Code d&apos;invitation :{' '}
            <span className="font-mono text-text-primary">{league.invite_code}</span>
          </p>
        </div>
        <Link
          href={`/l/${league.id}/flights/new`}
          className="rounded-md bg-amber px-4 py-2 text-sm font-medium text-navy hover:opacity-90"
        >
          + Poster un vol
        </Link>
      </div>

      {departingSoon.length > 0 && (
        <div className="mb-6 rounded-lg border border-teal/40 bg-navy-panel px-4 py-3 text-sm">
          <p className="font-medium text-teal">
            {departingSoon.length === 1
              ? 'Un vol décolle dans moins de 24h :'
              : `${departingSoon.length} vols décollent dans moins de 24h :`}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {departingSoon.map((f: any) => (
              <Link
                key={f.id}
                href={`/l/${league.id}/flights/${f.id}`}
                className="font-mono text-text-primary hover:text-amber"
              >
                {f.flight_number}
              </Link>
            ))}
          </p>
        </div>
      )}

      {!user.seniority_date && (
        <Link
          href="/profile"
          className="mb-6 block rounded-lg border border-amber/40 bg-navy-panel px-4 py-3 text-sm text-amber hover:bg-white/5"
        >
          Renseigne ta date d&apos;entrée en compagnie sur ton profil pour un indice de difficulté
          plus précis →
        </Link>
      )}

      <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-text-muted">À venir</h2>
      <div className="mb-8 overflow-hidden rounded-lg border border-navy-line bg-navy-panel">
        <div className="grid grid-cols-[1fr_1.2fr_1fr_auto] gap-4 border-b border-navy-line px-4 py-3 text-xs uppercase tracking-wide text-text-muted">
          <span>Vol</span>
          <span>Route</span>
          <span>Départ</span>
          <span>Statut</span>
        </div>
        {upcoming.map((f: any) => (
          <FlightBoardRow key={f.id} flight={f} leagueId={league.id} hasBet={bettedFlightIds.has(f.id)} />
        ))}
        {upcoming.length === 0 && (
          <p className="px-4 py-8 text-center text-text-muted">Aucun vol à venir. Sois le premier !</p>
        )}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-text-muted">
            Vols passés
          </h2>
          <div className="overflow-hidden rounded-lg border border-navy-line bg-navy-panel">
            {past.map((f: any) => (
              <FlightBoardRow key={f.id} flight={f} leagueId={league.id} hasBet={bettedFlightIds.has(f.id)} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
