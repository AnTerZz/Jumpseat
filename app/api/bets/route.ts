import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/currentUser';
import { canPlaceBet } from '@/lib/flightPhase';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const { flightId, predictedBoarded, predictedClass, predictedSeatsRemaining } = await request.json();
  if (!flightId || typeof predictedBoarded !== 'boolean') {
    return NextResponse.json({ error: 'Pari incomplet.' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: flight } = await supabase.from('flights').select('*').eq('id', flightId).maybeSingle();
  if (!flight) return NextResponse.json({ error: 'Vol introuvable.' }, { status: 404 });

  // Clôture à H-1h avant le décollage (pas au décollage lui-même) : il
  // reste une vraie incertitude jusqu'à ce moment précis.
  if (!canPlaceBet(flight)) {
    return NextResponse.json({ error: 'Les paris sont clos pour ce vol (H-1h avant le décollage).' }, { status: 409 });
  }

  // Modifier un pari déjà posé reste possible, mais coûte des points (voir
  // POINTS.betChangePenaltyPerEdit dans lib/points.ts) : on remonte
  // placed_at à maintenant (le multiplicateur temporel encaisse déjà une
  // partie du coût) et on incrémente edit_count pour la pénalité en plus.
  const { data: existing } = await supabase
    .from('bets')
    .select('id, edit_count')
    .eq('flight_id', flightId)
    .eq('user_id', user.id)
    .maybeSingle();

  const predictedClassValue = predictedBoarded ? predictedClass ?? null : null;
  const predictedSeatsValue = predictedBoarded ? predictedSeatsRemaining ?? null : null;

  if (existing) {
    const { error } = await supabase
      .from('bets')
      .update({
        predicted_boarded: predictedBoarded,
        predicted_class: predictedClassValue,
        predicted_seats_remaining: predictedSeatsValue,
        placed_at: new Date().toISOString(),
        edit_count: (existing.edit_count ?? 0) + 1,
      })
      .eq('id', existing.id);

    if (error) {
      return NextResponse.json({ error: "Impossible de modifier le pari." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, changed: true });
  }

  const { error } = await supabase.from('bets').insert({
    flight_id: flightId,
    user_id: user.id,
    predicted_boarded: predictedBoarded,
    predicted_class: predictedClassValue,
    predicted_seats_remaining: predictedSeatsValue,
    placed_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: "Impossible d'enregistrer le pari." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, changed: false });
}
