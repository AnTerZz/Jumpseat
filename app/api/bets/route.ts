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

  // Un pari posé ne peut plus être modifié ni écrasé — sinon on pourrait
  // attendre de voir le remplissage évoluer avant de trancher.
  const { data: existing } = await supabase
    .from('bets')
    .select('id')
    .eq('flight_id', flightId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: 'Pronostic déjà enregistré : impossible de le modifier.' },
      { status: 409 }
    );
  }

  const { error } = await supabase.from('bets').insert({
    flight_id: flightId,
    user_id: user.id,
    predicted_boarded: predictedBoarded,
    predicted_class: predictedBoarded ? predictedClass ?? null : null,
    predicted_seats_remaining: predictedBoarded ? predictedSeatsRemaining ?? null : null,
    placed_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: "Impossible d'enregistrer le pari." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
