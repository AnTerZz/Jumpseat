import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/currentUser';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });
  if (!user.seniority_date) {
    return NextResponse.json(
      { error: "Renseigne ta date d'entrée en compagnie (page profil) avant de rejoindre une ligue." },
      { status: 403 }
    );
  }

  const { inviteCode } = await request.json();
  if (!inviteCode) return NextResponse.json({ error: "Code d'invitation manquant." }, { status: 400 });

  const supabase = getSupabase();
  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('invite_code', inviteCode)
    .maybeSingle();

  if (!league) {
    return NextResponse.json({ error: "Ce lien d'invitation n'est pas valide." }, { status: 404 });
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

  return NextResponse.json({ league });
}
