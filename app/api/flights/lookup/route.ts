import { NextResponse } from 'next/server';
import { lookupFlight } from '@/lib/flightApi';
import { getCurrentUser } from '@/lib/currentUser';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const { flightNumber, date } = await request.json();
  if (!flightNumber || !date) {
    return NextResponse.json({ error: 'Numéro de vol et date requis.' }, { status: 400 });
  }

  try {
    const flights = await lookupFlight(flightNumber, date);
    if (flights.length === 0) {
      return NextResponse.json({ error: 'Vol introuvable pour cette date.' }, { status: 404 });
    }
    // Plusieurs résultats possibles (numéro réutilisé le même jour,
    // codeshares...) : on les renvoie tous, l'appelant choisit s'il y en a
    // plus d'un (voir app/l/[leagueId]/flights/new/page.tsx).
    return NextResponse.json({ flights });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erreur de recherche.' }, { status: 502 });
  }
}
