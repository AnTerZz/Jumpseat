import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/currentUser';
import { getSupabase } from '@/lib/supabaseServer';
import CreateLeagueForm from '@/components/CreateLeagueForm';
import Link from 'next/link';

export default async function LeaguesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.seniority_date) redirect('/profile?next=/leagues');

  const supabase = getSupabase();
  const { data: memberships } = await supabase
    .from('league_members')
    .select('total_points, leagues(id, name, invite_code)')
    .eq('user_id', user.id);

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 font-display text-2xl text-text-primary">Mes ligues</h1>

      <div className="mb-8 overflow-hidden rounded-lg border border-navy-line bg-navy-panel">
        {(memberships ?? []).map((m: any) => (
          <Link
            key={m.leagues.id}
            href={`/l/${m.leagues.id}`}
            className="flex items-center justify-between border-b border-navy-line px-4 py-3 last:border-b-0 hover:bg-white/5"
          >
            <span className="text-text-primary">{m.leagues.name}</span>
            <span className="font-mono text-amber">{m.total_points} pts</span>
          </Link>
        ))}
        {(!memberships || memberships.length === 0) && (
          <p className="px-4 py-8 text-center text-text-muted">
            Tu ne fais partie d&apos;aucune ligue pour l&apos;instant.
          </p>
        )}
      </div>

      <h2 className="mb-3 font-display text-lg text-text-primary">Créer une ligue</h2>
      <CreateLeagueForm />

      <p className="mt-6 text-sm text-text-muted">
        Pour rejoindre une ligue existante, demande le lien d&apos;invitation
        (<span className="font-mono">/join/...</span>) à un collègue déjà membre.
      </p>
    </main>
  );
}
