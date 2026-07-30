import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabaseServer';
import { sendNewFlightsDigestEmail } from '@/lib/email';

// Appelée une fois par jour par Vercel Cron (voir vercel.json). Regroupe
// tous les vols pas encore "digérés" (added_digest_sent_at vide) et envoie
// un e-mail par destinataire opt-in, avec tous ses vols en attente d'un
// coup — jamais un e-mail par vol.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const supabase = getSupabase();

  const { data: pendingFlights } = await supabase.from('flights').select('*').is('added_digest_sent_at', null);

  if (!pendingFlights || pendingFlights.length === 0) {
    return NextResponse.json({ pending: 0, recipients: 0, sent: 0 });
  }

  const leagueIds = [...new Set(pendingFlights.map((f) => f.league_id))];

  const { data: leagues } = await supabase.from('leagues').select('id, name').in('id', leagueIds);
  const leagueNameById = new Map((leagues ?? []).map((l) => [l.id, l.name]));

  const { data: members } = await supabase
    .from('league_members')
    .select('league_id, user_id')
    .in('league_id', leagueIds);

  const { data: optedInProfiles } = await supabase
    .from('profiles')
    .select('id, pseudo')
    .eq('notify_new_flights', true);
  const pseudoById = new Map((optedInProfiles ?? []).map((p) => [p.id, p.pseudo]));

  const membersByLeague = new Map<string, string[]>();
  for (const m of members ?? []) {
    if (!pseudoById.has(m.user_id)) continue; // pas opt-in
    const list = membersByLeague.get(m.league_id) ?? [];
    list.push(m.user_id);
    membersByLeague.set(m.league_id, list);
  }

  type DigestItem = { flightNumber: string; leagueName: string; flightUrl: string };
  const digestByUser = new Map<string, DigestItem[]>();

  for (const flight of pendingFlights) {
    for (const userId of membersByLeague.get(flight.league_id) ?? []) {
      if (userId === flight.created_by) continue; // pas de notif pour son propre vol posté
      const list = digestByUser.get(userId) ?? [];
      list.push({
        flightNumber: flight.flight_number,
        leagueName: leagueNameById.get(flight.league_id) ?? 'ta ligue',
        flightUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/l/${flight.league_id}/flights/${flight.id}`,
      });
      digestByUser.set(userId, list);
    }
  }

  let sent = 0;
  for (const [userId, items] of digestByUser) {
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;
    if (!email) continue;

    try {
      await sendNewFlightsDigestEmail({ to: email, pseudo: pseudoById.get(userId) ?? 'là-bas', flights: items });
      sent += 1;
    } catch {
      // Best effort, comme /api/remind : un échec d'envoi vers UN destinataire
      // ne doit pas empêcher les autres, ni faire réapparaître ces vols dans
      // le digest de tout le monde le lendemain (voir marquage ci-dessous).
    }
  }

  // Marqués "traités" après la tentative d'envoi, succès ou non, pour ne pas
  // faire grossir indéfiniment le digest si un destinataire a une adresse
  // invalide — au pire un destinataire manque un vol occasionnellement,
  // plutôt que d'accumuler un digest toujours plus long.
  await supabase
    .from('flights')
    .update({ added_digest_sent_at: new Date().toISOString() })
    .in(
      'id',
      pendingFlights.map((f) => f.id)
    );

  return NextResponse.json({ pending: pendingFlights.length, recipients: digestByUser.size, sent });
}
