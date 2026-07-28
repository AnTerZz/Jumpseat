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
    const info = await lookupFlight(flightNumber, date);
    if (!info) return NextResponse.json({ error: 'Vol introuvable pour cette date.' }, { status: 404 });
    return NextResponse.json(info);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erreur de recherche.' }, { status: 502 });
  }
}
