import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/currentUser';
import { computeBetPoints } from '@/lib/points';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const { actualBoarded, actualClass, actualSeatsRemaining } = await request.json();
  const supabase = getSupabase();

  const { data: flight } = await supabase.from('flights').select('*').eq('id', params.id).maybeSingle();
  if (!flight) return NextResponse.json({ error: 'Vol introuvable.' }, { status: 404 });
  if (flight.created_by !== user.id) {
    return NextResponse.json({ error: 'Seule la personne qui a posté ce vol peut le résoudre.' }, { status: 403 });
  }
  if (flight.status === 'resolved') {
    return NextResponse.json({ error: 'Ce vol est déjà résolu.' }, { status: 409 });
  }
  if (new Date(flight.scheduled_departure).getTime() > Date.now()) {
    return NextResponse.json({ error: "Le vol n'a pas encore décollé." }, { status: 409 });
  }

  const resolvedAt = new Date().toISOString();

  await supabase
    .from('flights')
    .update({
      actual_boarded: actualBoarded,
      actual_class: actualBoarded ? actualClass ?? null : null,
      actual_seats_remaining: actualBoarded ? actualSeatsRemaining ?? null : null,
      status: 'resolved',
      resolved_at: resolvedAt,
    })
    .eq('id', params.id);

  const resolvedFlight = {
    created_by: flight.created_by,
    scheduled_departure: flight.scheduled_departure,
    actual_boarded: actualBoarded,
    actual_class: actualBoarded ? actualClass ?? null : null,
    actual_seats_remaining: actualBoarded ? actualSeatsRemaining ?? null : null,
  };

  const { data: bets } = await supabase.from('bets').select('*').eq('flight_id', params.id);

  for (const bet of bets ?? []) {
    const points = computeBetPoints(bet as any, resolvedFlight);
    await supabase.from('bets').update({ points_awarded: points }).eq('id', (bet as any).id);

    // Le score est par ligue (league_members), pas sur le profil global.
    const { data: membership } = await supabase
      .from('league_members')
      .select('total_points')
      .eq('league_id', flight.league_id)
      .eq('user_id', (bet as any).user_id)
      .maybeSingle();

    if (membership) {
      await supabase
        .from('league_members')
        .update({ total_points: (membership.total_points ?? 0) + points })
        .eq('league_id', flight.league_id)
        .eq('user_id', (bet as any).user_id);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const supabase = getSupabase();
  const { data: flight } = await supabase.from('flights').select('*').eq('id', params.id).maybeSingle();
  if (!flight) return NextResponse.json({ error: 'Vol introuvable.' }, { status: 404 });

  if (flight.created_by !== user.id) {
    return NextResponse.json({ error: 'Seule la personne qui a posté ce vol peut le supprimer.' }, { status: 403 });
  }
  if (flight.status === 'resolved') {
    return NextResponse.json(
      { error: 'Un vol déjà résolu ne peut plus être supprimé : les points ont déjà été distribués.' },
      { status: 409 }
    );
  }

  // `on delete cascade` sur flights supprime aussi ses bets et load_updates.
  await supabase.from('flights').delete().eq('id', params.id);

  return NextResponse.json({ ok: true });
}
