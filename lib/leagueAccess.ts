import { notFound, redirect } from 'next/navigation';
import { getSupabase } from './supabaseServer';

export async function requireLeagueMembership(leagueId: string, userId: string) {
  const supabase = getSupabase();

  const { data: league } = await supabase.from('leagues').select('*').eq('id', leagueId).maybeSingle();
  if (!league) notFound();

  const { data: membership } = await supabase
    .from('league_members')
    .select('*')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) redirect('/leagues');

  return { league, membership };
}
