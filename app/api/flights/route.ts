import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/currentUser';
import { isAtLeastThreeDaysOut } from '@/lib/flightPhase';
import { computeDifficulty, getDataTier } from '@/lib/difficulty';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const body = await request.json();
  const {
    leagueId,
    flightNumber,
    flightDate,
    origin,
    destination,
    scheduledDeparture,
    aircraftType,
    airlineCode,
    ticketType,
    seatsByCabin,
  } = body;

  if (!leagueId || !flightNumber || !flightDate || !scheduledDeparture) {
    return NextResponse.json({ error: 'Informations de vol incomplètes.' }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: membership } = await supabase
    .from('league_members')
    .select('*')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "Tu n'es pas membre de cette ligue." }, { status: 403 });
  }

  if (!isAtLeastThreeDaysOut(scheduledDeparture)) {
    return NextResponse.json(
      { error: 'Un vol ne peut être posté que s\'il décolle dans au moins 3 jours.' },
      { status: 400 }
    );
  }

  const dataTier = getDataTier(airlineCode);

  const { data: flight, error } = await supabase
    .from('flights')
    .insert({
      league_id: leagueId,
      created_by: user.id,
      flight_number: flightNumber,
      flight_date: flightDate,
      origin: origin ?? null,
      destination: destination ?? null,
      scheduled_departure: scheduledDeparture,
      aircraft_type: aircraftType ?? null,
      airline_code: airlineCode ?? null,
      data_tier: dataTier,
      ticket_type: ticketType ?? null,
    })
    .select()
    .single();

  if (error || !flight) {
    return NextResponse.json({ error: 'Impossible de créer le vol.' }, { status: 500 });
  }

  // Premier constat de remplissage : obligatoire pour les vols "rich",
  // enregistré même vide (objet {}) pour les vols "basic" afin de garder un
  // point de départ pour l'historique/l'indice de difficulté.
  const initialDifficulty = computeDifficulty({
    ticketType: ticketType ?? null,
    dataTier,
    scheduledDeparture,
    recordedAt: new Date(),
    seniorityDate: user.seniority_date,
    seatsByCabin: seatsByCabin ?? null,
  });

  await supabase.from('flight_load_updates').insert({
    flight_id: flight.id,
    submitted_by: user.id,
    seats_by_cabin: seatsByCabin ?? {},
    difficulty: initialDifficulty,
  });

  return NextResponse.json({ flight });
}
