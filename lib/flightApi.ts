// Ce module isole l'appel à l'API externe de données de vol, pour pouvoir
// changer de fournisseur facilement (ex: passer à l'API officielle
// Air France-KLM developer.airfranceklm.com si tu obtiens un accès).
//
// Fournisseur par défaut : AeroDataBox, via RapidAPI (clés = longues
// chaînes hexadécimales, host aerodatabox.p.rapidapi.com). Si ta clé vient
// d'API.market plutôt que de RapidAPI directement, remplace l'URL et
// l'en-tête ci-dessous par https://prod.api.market/api/v1/aedbx/aerodatabox/...
// + le header x-api-market-key (clés au format cuid2, ex: "cms57...").

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
  const url = `https://aerodatabox.p.rapidapi.com/flights/number/${cleaned}/${date}`;

  const res = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com',
    },
    // Les résultats changent peu une fois publiés : petit cache pour ménager le quota.
    next: { revalidate: 300 },
  });

  // Vol inconnu pour cette date : 404 chez AeroDataBox/RapidAPI. Le 204 reste
  // géré par précaution (observé en pratique via le proxy API.market).
  if (res.status === 404 || res.status === 204) return [];
  if (!res.ok) {
    throw new Error(`Recherche du vol impossible (code ${res.status}).`);
  }

  const data = await res.json();
  // RapidAPI renvoie un tableau nu ; le fallback { value: [...] } reste là
  // par précaution si tu repasses un jour par un proxy qui enveloppe la
  // réponse (ex: API.market).
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
