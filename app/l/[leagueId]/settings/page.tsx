import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/currentUser';
import { requireLeagueMembership } from '@/lib/leagueAccess';
import LeagueSettingsForm from '@/components/LeagueSettingsForm';

export default async function LeagueSettingsPage({ params }: { params: { leagueId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { league, membership } = await requireLeagueMembership(params.leagueId, user.id);

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 font-display text-2xl text-text-primary">Réglages — {league.name}</h1>

      <div className="mb-6 rounded-lg border border-navy-line bg-navy-panel p-4">
        <p className="mb-1 text-xs uppercase tracking-wide text-text-muted">Lien d&apos;invitation</p>
        <p className="break-all font-mono text-sm text-text-primary">/join/{league.invite_code}</p>
        <p className="mt-1 text-xs text-text-muted">
          Partage ce lien (Slack, Teams...) pour inviter un collègue dans la ligue.
        </p>
      </div>

      {membership.role === 'owner' ? (
        <LeagueSettingsForm leagueId={league.id} initialShowConsensus={league.show_consensus} />
      ) : (
        <p className="text-sm text-text-muted">
          Seul le créateur de la ligue peut modifier les réglages ci-dessous.
        </p>
      )}
    </main>
  );
}
