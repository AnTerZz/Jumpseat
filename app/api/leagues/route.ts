import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/currentUser';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });
  if (!user.seniority_date) {
    return NextResponse.json(
      { error: "Renseigne ta date d'entrée en compagnie (page profil) avant de créer une ligue." },
      { status: 403 }
    );
  }

  const { name } = await request.json();
  const cleanName = (name ?? '').trim();
  if (cleanName.length < 2) {
    return NextResponse.json({ error: 'Nom de ligue trop court.' }, { status: 400 });
  }

  const supabase = getSupabase();

  // N'importe qui peut créer une ligue, aucune restriction de rôle.
  const { data: league, error } = await supabase
    .from('leagues')
    .insert({ name: cleanName, created_by: user.id })
    .select()
    .single();

  if (error || !league) {
    return NextResponse.json({ error: 'Impossible de créer la ligue.' }, { status: 500 });
  }

  await supabase.from('league_members').insert({
    league_id: league.id,
    user_id: user.id,
    role: 'owner',
  });

  return NextResponse.json({ league });
}
