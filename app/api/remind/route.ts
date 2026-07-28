import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabaseServer';
import { sendResultReminderEmail } from '@/lib/email';

// Appelée périodiquement par Vercel Cron (voir vercel.json). Protégée par
// un secret partagé pour éviter qu'un tiers ne déclenche l'envoi d'e-mails.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const supabase = getSupabase();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: flights } = await supabase
    .from('flights')
    .select('*')
    .neq('status', 'resolved')
    .is('reminder_sent_at', null)
    .lte('scheduled_departure', twentyFourHoursAgo);

  let sent = 0;
  for (const flight of flights ?? []) {
    const { data: authUser } = await supabase.auth.admin.getUserById(flight.created_by);
    const email = authUser?.user?.email;
    const { data: profile } = await supabase
      .from('profiles')
      .select('pseudo')
      .eq('id', flight.created_by)
      .maybeSingle();

    if (!email) continue;

    try {
      await sendResultReminderEmail({
        to: email,
        pseudo: profile?.pseudo ?? 'là-bas',
        flightNumber: flight.flight_number,
        flightUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/l/${flight.league_id}/flights/${flight.id}`,
      });
      await supabase
        .from('flights')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', flight.id);
      sent += 1;
    } catch {
      // On continue avec les autres vols même si un envoi échoue ; le
      // prochain passage du cron retentera puisque reminder_sent_at reste
      // vide pour celui-ci.
    }
  }

  return NextResponse.json({ checked: flights?.length ?? 0, sent });
}
