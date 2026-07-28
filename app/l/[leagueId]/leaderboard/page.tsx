import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/currentUser';
import { getSupabase } from '@/lib/supabaseServer';
import { requireLeagueMembership } from '@/lib/leagueAccess';
import { getFlightDistanceKm } from '@/lib/distance';
import SplitFlap from '@/components/SplitFlap';

export default async function LeagueLeaderboardPage({ params }: { params: { leagueId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { league } = await requireLeagueMembership(params.leagueId, user.id);

  const supabase = getSupabase();

  const { data: members } = await supabase
    .from('league_members')
    .select('total_points, profiles(pseudo)')
    .eq('league_id', league.id)
    .order('total_points', { ascending: false });

  // Distance parcourue : uniquement les vols où la personne a effectivement
  // embarqué (sinon elle n'a pas voyagé) — voir BACKLOG.md.
  const { data: boardedFlights } = await supabase
    .from('flights')
    .select('created_by, origin, destination, profiles!flights_created_by_fkey(pseudo)')
    .eq('league_id', league.id)
    .eq('actual_boarded', true);

  const distanceByUser = new Map<string, { pseudo: string; km: number }>();
  (boardedFlights ?? []).forEach((f: any) => {
    const km = getFlightDistanceKm(f.origin, f.destination);
    if (km == null) return;
    const key = f.created_by;
    const current = distanceByUser.get(key) ?? { pseudo: f.profiles?.pseudo ?? '?', km: 0 };
    current.km += km;
    distanceByUser.set(key, current);
  });
  const distanceRanking = Array.from(distanceByUser.values()).sort((a, b) => b.km - a.km);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-display text-2xl text-text-primary">Classement — {league.name}</h1>

      <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-text-muted">Points</h2>
      <ol className="mb-8 overflow-hidden rounded-lg border border-navy-line bg-navy-panel">
        {(members ?? []).map((m: any, i: number) => (
          <li
            key={i}
            className="flex items-center gap-4 border-b border-navy-line px-4 py-3 last:border-b-0"
          >
            <span className="w-10">
              <SplitFlap value={String(i + 1).padStart(2, '0')} />
            </span>
            <span className="flex-1 text-text-primary">{m.profiles?.pseudo ?? '?'}</span>
            <span className="font-mono text-amber">{m.total_points} pts</span>
          </li>
        ))}
        {(!members || members.length === 0) && (
          <li className="px-4 py-8 text-center text-text-muted">Personne au classement pour l&apos;instant.</li>
        )}
      </ol>

      <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-text-muted">
        Plus grands voyageurs (distance parcourue)
      </h2>
      <ol className="overflow-hidden rounded-lg border border-navy-line bg-navy-panel">
        {distanceRanking.map((d, i) => (
          <li
            key={i}
            className="flex items-center gap-4 border-b border-navy-line px-4 py-3 last:border-b-0"
          >
            <span className="w-10">
              <SplitFlap value={String(i + 1).padStart(2, '0')} />
            </span>
            <span className="flex-1 text-text-primary">{d.pseudo}</span>
            <span className="font-mono text-teal">{d.km.toLocaleString('fr-FR')} km</span>
          </li>
        ))}
        {distanceRanking.length === 0 && (
          <li className="px-4 py-8 text-center text-text-muted">
            Pas encore de vol embarqué et résolu dans cette ligue.
          </li>
        )}
      </ol>
    </main>
  );
}
