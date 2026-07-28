// Référentiel de coordonnées d'aéroports (code IATA -> latitude/longitude),
// pour calculer la distance à vol d'oiseau entre origine et destination
// (tableau des plus grands voyageurs par distance parcourue).
//
// Couvre les hubs et destinations principales du réseau Air France-KLM-
// Transavia + les grands hubs mondiaux les plus courants. Volontairement
// pas exhaustif (un référentiel mondial complet type OpenFlights compte
// plusieurs milliers d'aéroports) : un vol dont l'aéroport n'est pas listé
// est simplement ignoré dans le calcul de distance plutôt que de plaquer
// une valeur fausse — complète cette liste au besoin.

export const AIRPORT_COORDINATES: Record<string, [number, number]> = {
  // France
  CDG: [49.0097, 2.5479],
  ORY: [48.7233, 2.3794],
  NCE: [43.6584, 7.2159],
  LYS: [45.7256, 5.0811],
  MRS: [43.4393, 5.2214],
  TLS: [43.6291, 1.3638],
  BOD: [44.8283, -0.7156],
  NTE: [47.1532, -1.6108],
  RNS: [48.0695, -1.7344],
  SXB: [48.5383, 7.6282],
  MPL: [43.5762, 3.9631],
  BIQ: [43.4684, -1.5311],
  AJA: [41.9236, 8.8029],
  BIA: [42.5527, 9.4837],
  FSC: [41.5, 9.0972],
  // Outre-mer
  FDF: [14.5911, -61.0031],
  PTP: [16.2653, -61.5319],
  RUN: [-20.8901, 55.5103],
  NOU: [-22.0146, 166.213],
  PPT: [-17.5537, -149.6069],
  CAY: [4.8198, -52.3606],
  // Pays-Bas
  AMS: [52.3105, 4.7683],
  RTM: [51.9569, 4.4372],
  EIN: [51.4501, 5.3745],
  // Europe
  LHR: [51.4700, -0.4543],
  LGW: [51.1481, -0.1903],
  MAN: [53.3537, -2.275],
  EDI: [55.95, -3.3725],
  DUB: [53.4213, -6.2701],
  FRA: [50.0379, 8.5622],
  MUC: [48.3538, 11.7861],
  BER: [52.3667, 13.5033],
  MAD: [40.4936, -3.5668],
  BCN: [41.2971, 2.0785],
  FCO: [41.8003, 12.2389],
  MXP: [45.6306, 8.7281],
  ZRH: [47.4647, 8.5492],
  GVA: [46.2381, 6.1089],
  VIE: [48.1103, 16.5697],
  CPH: [55.6180, 12.6560],
  ARN: [59.6519, 17.9186],
  OSL: [60.1976, 11.1004],
  HEL: [60.3172, 24.9633],
  LIS: [38.7813, -9.1359],
  OPO: [41.2481, -8.6814],
  ATH: [37.9364, 23.9445],
  IST: [41.2753, 28.7519],
  BRU: [50.9014, 4.4844],
  WAW: [52.1657, 20.9671],
  PRG: [50.1008, 14.26],
  BUD: [47.4298, 19.2611],
  RIX: [56.9236, 23.9711],
  // Moyen-Orient
  DXB: [25.2532, 55.3657],
  DOH: [25.2609, 51.6138],
  AUH: [24.433, 54.6511],
  TLV: [32.0055, 34.8854],
  JED: [21.6796, 39.1565],
  RUH: [24.9576, 46.6988],
  CAI: [30.1219, 31.4056],
  // Afrique
  CMN: [33.3675, -7.59],
  ALG: [36.6910, 3.2154],
  TUN: [36.851, 10.2272],
  DKR: [14.6708, -17.0733],
  ABJ: [5.2614, -3.9263],
  LOS: [6.5774, 3.3212],
  JNB: [-26.1392, 28.246],
  NBO: [-1.3192, 36.9278],
  ADD: [8.9779, 38.7993],
  LBV: [0.4586, 9.4123],
  DLA: [4.0061, 9.7195],
  PNR: [-4.2517, 11.8867],
  FIH: [-4.3857, 15.4446],
  ANT: [-18.7969, 47.4788],
  // Amérique du Nord
  JFK: [40.6413, -73.7781],
  EWR: [40.6895, -74.1745],
  LAX: [33.9416, -118.4085],
  SFO: [37.6213, -122.379],
  ORD: [41.9742, -87.9073],
  MIA: [25.7959, -80.287],
  ATL: [33.6407, -84.4277],
  IAH: [29.9902, -95.3368],
  BOS: [42.3656, -71.0096],
  SEA: [47.4502, -122.3088],
  YUL: [45.4706, -73.7408],
  YYZ: [43.6777, -79.6248],
  YVR: [49.1967, -123.1815],
  MEX: [19.4363, -99.0721],
  // Caraïbes / Amérique du Sud
  CUN: [21.0365, -86.8771],
  HAV: [22.9892, -82.4091],
  PUJ: [18.5674, -68.3634],
  GRU: [-23.4356, -46.4731],
  GIG: [-22.81, -43.2506],
  EZE: [-34.8222, -58.5358],
  SCL: [-33.393, -70.7858],
  BOG: [4.7016, -74.1469],
  LIM: [-12.0219, -77.1143],
  // Asie
  HND: [35.5494, 139.7798],
  NRT: [35.7647, 140.3864],
  KIX: [34.4273, 135.2444],
  ICN: [37.4602, 126.4407],
  PVG: [31.1443, 121.8083],
  PEK: [40.0801, 116.5846],
  PKX: [39.5098, 116.4109],
  HKG: [22.3080, 113.9185],
  SIN: [1.3644, 103.9915],
  BKK: [13.6900, 100.7501],
  KUL: [2.7456, 101.7099],
  MNL: [14.5086, 121.0194],
  DEL: [28.5562, 77.1000],
  BOM: [19.0887, 72.8679],
  SGN: [10.8188, 106.6520],
  // Océanie
  SYD: [-33.9399, 151.1753],
  MEL: [-37.6690, 144.8410],
  AKL: [-37.0082, 174.7850],
};

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Distance à vol d'oiseau (formule de haversine), en kilomètres.
export function haversineDistanceKm(
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number]
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c);
}

// Retourne la distance en km entre deux codes IATA, ou null si l'un des
// deux aéroports n'est pas dans le référentiel ci-dessus.
export function getFlightDistanceKm(origin: string | null, destination: string | null): number | null {
  if (!origin || !destination) return null;
  const from = AIRPORT_COORDINATES[origin.toUpperCase()];
  const to = AIRPORT_COORDINATES[destination.toUpperCase()];
  if (!from || !to) return null;
  return haversineDistanceKm(from, to);
}
