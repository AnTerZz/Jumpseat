import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/currentUser';
import { getSupabase } from '@/lib/supabaseServer';

export default async function JoinLeaguePage({ params }: { params: { code: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    // On revient ici juste après connexion pour finaliser l'adhésion.
    redirect(`/login?next=/join/${params.code}`);
  }
  if (!user.seniority_date) {
    // Idem après avoir complété le profil.
    redirect(`/profile?next=${encodeURIComponent(`/join/${params.code}`)}`);
  }

  const supabase = getSupabase();
  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('invite_code', params.code)
    .maybeSingle();

  if (!league) {
    return (
      <main className="mx-auto max-w-md px-4 py-8 text-center">
        <p className="text-text-primary">Ce lien d&apos;invitation n&apos;est pas valide.</p>
      </main>
    );
  }

  const { data: existing } = await supabase
    .from('league_members')
    .select('*')
    .eq('league_id', league.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from('league_members').insert({
      league_id: league.id,
      user_id: user.id,
      role: 'member',
    });
  }

  redirect(`/l/${league.id}`);
}
