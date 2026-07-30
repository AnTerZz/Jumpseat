// Ce module isole l'appel à l'API externe de données de vol, pour pouvoir
// changer de fournisseur facilement (ex: passer à l'API officielle
// Air France-KLM developer.airfranceklm.com si tu obtiens un accès).
//
// Fournisseur par défaut : AeroDataBox, via le proxy API.market (clés au
// format cuid2, ex: "cms57..." — distinctes des clés RapidAPI classiques,
// qui sont de longues chaînes hexadécimales et passent par un tout autre
// host/en-tête). Si ta clé vient de RapidAPI directement plutôt que
// d'API.market, remplace l'URL et l'en-tête ci-dessous par
// https://aerodatabox.p.rapidapi.com/... + X-RapidAPI-Key/X-RapidAPI-Host.

export type FlightInfo = {
  flightNumber: string;
  origin: string | null;
  destination: string | null;
  scheduledDeparture: string | null; // ISO 8601 UTC
  aircraftType: string | null;
  airline: string | null;
  airlineCode: string | null; // code IATA (ex: AF, KL, TO) — utilisé pour le data_tier
};

// Renvoie TOUS les vols candidats pour ce numéro/cette date — AeroDataBox
// renvoie parfois plusieurs résultats (ex: numéro réutilisé pour un aller ET
// un retour le même jour, codeshares...), donc prendre le premier au hasard
// pouvait associer le mauvais horaire/appareil au vol posté. C'est à
// l'appelant de désambiguïser si la liste contient plus d'un élément (voir
// app/api/flights/lookup/route.ts).
export async function lookupFlight(flightNumber: string, date: string): Promise<FlightInfo[]> {
  const key = process.env.AERODATABOX_RAPIDAPI_KEY;
  if (!key) {
    throw new Error('AERODATABOX_RAPIDAPI_KEY manquant dans les variables d\'environnement.');
  }

  const cleaned = flightNumber.replace(/\s+/g, '').toUpperCase();
  const url = `https://prod.api.market/api/v1/aedbx/aerodatabox/flights/number/${cleaned}/${date}`;

  const res = await fetch(url, {
    headers: {
      'x-api-market-key': key,
    },
    // Les résultats changent peu une fois publiés : petit cache pour ménager le quota.
    next: { revalidate: 300 },
  });

  // Vol inconnu pour cette date : 404 chez AeroDataBox directement, 204
  // (corps vide) via le proxy API.market observé en pratique — on couvre les deux.
  if (res.status === 404 || res.status === 204) return [];
  if (!res.ok) {
    throw new Error(`Recherche du vol impossible (code ${res.status}).`);
  }

  const data = await res.json();
  // API.market enveloppe le tableau de résultats dans { value: [...] },
  // contrairement à l'appel RapidAPI direct qui renvoie un tableau nu.
  const list = Array.isArray(data) ? data : Array.isArray(data?.value) ? data.value : [];

  // Le code compagnie vient de préférence de l'API ; à défaut, on le
  // déduit du préfixe alphabétique du numéro de vol (ex: "AF1680" -> "AF"),
  // ce qui marche pour la quasi-totalité des numéros de vol commerciaux.
  const codeFromNumber = cleaned.match(/^[A-Z]{2,3}/)?.[0] ?? null;

  return list.map((item: any) => {
    // Le champ vient sous la forme "2026-08-05 05:30Z" (espace, pas de 'T') :
    // on le normalise en ISO 8601 strict pour le stockage timestamptz.
    const rawUtc = item?.departure?.scheduledTime?.utc as string | undefined;
    const scheduledDeparture = rawUtc ? rawUtc.replace(' ', 'T') : null;

    return {
      flightNumber: cleaned,
      origin: item?.departure?.airport?.iata ?? null,
      destination: item?.arrival?.airport?.iata ?? null,
      scheduledDeparture,
      aircraftType: item?.aircraft?.model ?? null,
      airline: item?.airline?.name ?? null,
      airlineCode: item?.airline?.iata ?? codeFromNumber,
    };
  });
}
