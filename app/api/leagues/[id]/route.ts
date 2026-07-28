import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/currentUser';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const supabase = getSupabase();
  const { data: membership } = await supabase
    .from('league_members')
    .select('*')
    .eq('league_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership || membership.role !== 'owner') {
    return NextResponse.json(
      { error: 'Seul le créateur de la ligue peut modifier ces réglages.' },
      { status: 403 }
    );
  }

  const { showConsensus, name } = await request.json();
  const updates: Record<string, unknown> = {};
  if (typeof showConsensus === 'boolean') updates.show_consensus = showConsensus;
  if (typeof name === 'string' && name.trim().length >= 2) updates.name = name.trim();

  const { error } = await supabase.from('leagues').update(updates).eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: 'Impossible de mettre à jour la ligue.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
