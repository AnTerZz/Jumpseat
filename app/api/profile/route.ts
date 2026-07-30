import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/currentUser';

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const { pseudo, seniorityDate, notifyNewFlights } = await request.json();
  const cleanPseudo = (pseudo ?? '').trim();
  if (cleanPseudo.length < 2) {
    return NextResponse.json({ error: 'Pseudo trop court.' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('profiles')
    .update({ pseudo: cleanPseudo, seniority_date: seniorityDate || null, notify_new_flights: !!notifyNewFlights })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Impossible de mettre à jour le profil.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
