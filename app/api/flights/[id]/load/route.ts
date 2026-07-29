import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/currentUser';
import { computeDifficulty, type TicketType, type DataTier } from '@/lib/difficulty';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const { seatsByCabin, r1Count, note } = await request.json();

  const supabase = getSupabase();
  const { data: flight } = await supabase.from('flights').select('*').eq('id', params.id).maybeSingle();
  if (!flight) return NextResponse.json({ error: 'Vol introuvable.' }, { status: 404 });

  // N'importe quel membre de la ligue peut mettre à jour le remplissage,
  // pas seulement le posteur du vol.
  const { data: membership } = await supabase
    .from('league_members')
    .select('*')
    .eq('league_id', flight.league_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "Tu n'es pas membre de cette ligue." }, { status: 403 });
  }

  if (flight.data_tier !== 'rich') {
    return NextResponse.json(
      { error: 'Pas de suivi de remplissage détaillé pour cette compagnie.' },
      { status: 400 }
    );
  }

  const recordedAt = new Date();
  const difficulty = computeDifficulty({
    ticketType: flight.ticket_type as TicketType | null,
    dataTier: flight.data_tier as DataTier,
    scheduledDeparture: flight.scheduled_departure,
    recordedAt,
    seniorityDate: user.seniority_date,
    seatsByCabin: seatsByCabin ?? null,
  });

  const { error } = await supabase.from('flight_load_updates').insert({
    flight_id: flight.id,
    submitted_by: user.id,
    recorded_at: recordedAt.toISOString(),
    seats_by_cabin: seatsByCabin ?? {},
    r1_count: typeof r1Count === 'number' ? r1Count : null,
    difficulty,
    note: note || null,
  });

  if (error) {
    return NextResponse.json({ error: "Impossible d'enregistrer le remplissage." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
