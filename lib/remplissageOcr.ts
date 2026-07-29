// Extraction du tableau de remplissage AF (capture d'écran collée) via OCR
// client (tesseract.js) — logique pure, indépendante de React/Tesseract pour
// rester testable facilement (voir scripts/test-remplissage-ocr.ts).
//
// Principe : reconstruction géométrique (clusters x/y avec tolérance) POUR
// LA STRUCTURE, puis identification de chaque ligne/colonne par son texte
// (Capacité/Ventes/Pad, Business/Premium Economy/Economy/La Première) —
// l'orthographe de ces mots ne varie jamais, donc les matcher est fiable,
// contrairement à supposer "la 1re ligne est toujours l'en-tête, la
// dernière toujours le total" : un artefact OCR (ex: les puces ovales de la
// capture) peut créer une ligne fantôme et décaler tout ce qui suit si on
// se fie uniquement à la position/au comptage. En identifiant chaque ligne
// par ce qu'elle contient, une ligne bruitée est simplement ignorée au lieu
// de décaler les suivantes.

export type OcrWord = { text: string; x0: number; y0: number; x1: number; y1: number };

// Gardé en référence/validation légère — l'identification réelle des
// cabines se fait maintenant par le texte de chaque ligne, pas par ce
// tableau (voir identifyRow ci-dessous).
export const CABIN_SEQUENCE_BY_COUNT: Record<number, string[]> = {
  2: ['Business', 'Economy'],
  3: ['Business', 'Premium Economy', 'Economy'],
  4: ['La Première', 'Business', 'Premium Economy', 'Economy'],
};

type CabinValues = { capacity: number; sold: number; pad: number };

export type ParsedRemplissage = {
  cabins: Record<string, CabinValues>; // toutes les cabines détectées, y compris celles non suivies par l'app (ex: La Première)
  warnings: string[];
};

// Retire les accents (ex: "Capacité" -> "capacite") sans dépendre d'une
// regex à échappement Unicode, pour éviter tout souci d'encodage : on
// décompose (NFD) puis on filtre les points de code des diacritiques
// combinants (U+0300 à U+036F) un par un.
function normalize(s: string): string {
  let result = '';
  for (const ch of s.normalize('NFD')) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x0300 || code > 0x036f) result += ch;
  }
  return result.toLowerCase();
}

// Regroupe des éléments en "paquets" selon une coordonnée (y pour les
// lignes, x pour les colonnes), avec une tolérance dérivée de la taille
// médiane des éléments — plus robuste qu'un seuil fixe face à des captures
// de résolutions différentes.
function cluster1D<T>(items: T[], start: (t: T) => number, end: (t: T) => number): T[][] {
  if (items.length === 0) return [];

  const sizes = items.map((t) => end(t) - start(t)).sort((a, b) => a - b);
  const medianSize = sizes[Math.floor(sizes.length / 2)] || 10;
  const threshold = medianSize * 0.6;

  const sorted = [...items].sort((a, b) => (start(a) + end(a)) / 2 - (start(b) + end(b)) / 2);

  const clusters: T[][] = [];
  let current: T[] = [];
  let currentCenter = -Infinity;

  for (const item of sorted) {
    const center = (start(item) + end(item)) / 2;
    if (current.length === 0 || Math.abs(center - currentCenter) <= threshold) {
      current.push(item);
      currentCenter = current.reduce((sum, t) => sum + (start(t) + end(t)) / 2, 0) / current.length;
    } else {
      clusters.push(current);
      current = [item];
      currentCenter = center;
    }
  }
  if (current.length > 0) clusters.push(current);

  return clusters;
}

// Regroupe les mots en "lignes" selon leur position verticale.
export function groupIntoRows(words: OcrWord[]): OcrWord[][] {
  const rows = cluster1D(words, (w) => w.y0, (w) => w.y1);
  return rows.map((row) => [...row].sort((a, b) => a.x0 - b.x0));
}

function isNumeric(word: OcrWord): boolean {
  return /^\d+$/.test(word.text.trim());
}

type RowRole =
  | { kind: 'header' }
  | { kind: 'total' }
  | { kind: 'cabin'; name: string }
  | { kind: 'unknown' };

// Identifie une ligne par son texte plutôt que sa position — l'ordre exact
// (Capacité/Ventes/Pad, Business/Premium Economy/Economy/La Première/Total
// Avion) ne change jamais, donc matcher ces mots est fiable même si l'OCR
// introduit une ligne parasite ailleurs (ex: une puce/icône mal lue).
function identifyRow(row: OcrWord[]): RowRole {
  const text = row.map((w) => normalize(w.text)).join(' ');
  if (text.includes('capacit') || text.includes('vente')) return { kind: 'header' };
  if (text.includes('total')) return { kind: 'total' };
  // "première" avant "premium" avant "economy" : une ligne "Premium Economy"
  // contient aussi "economy", il faut donc tester le plus spécifique d'abord.
  if (text.includes('premiere')) return { kind: 'cabin', name: 'La Première' };
  if (text.includes('premium')) return { kind: 'cabin', name: 'Premium Economy' };
  if (text.includes('economy') || text.includes('economie')) return { kind: 'cabin', name: 'Economy' };
  if (text.includes('business')) return { kind: 'cabin', name: 'Business' };
  return { kind: 'unknown' };
}

export function parseRemplissageWords(words: OcrWord[]): ParsedRemplissage | { error: string } {
  const rows = groupIntoRows(words);

  let sawHeader = false;
  const cabinRows: { name: string; words: OcrWord[] }[] = [];
  let unrecognizedCount = 0;

  for (const row of rows) {
    const role = identifyRow(row);
    if (role.kind === 'header') sawHeader = true;
    else if (role.kind === 'cabin') cabinRows.push({ name: role.name, words: row });
    else if (role.kind === 'unknown' && row.some((w) => !isNumeric(w))) unrecognizedCount += 1;
    // 'total' et les lignes purement numériques non reconnues sont ignorées sans compter comme bruit.
  }

  if (!sawHeader) {
    return {
      error:
        "Impossible de détecter l'en-tête du tableau (Capacité/Ventes). Vérifie que la capture inclut bien les titres de colonnes.",
    };
  }

  if (cabinRows.length === 0) {
    return {
      error:
        "Aucune cabine reconnue (Business/Premium Economy/Economy/La Première). Vérifie que la capture est nette.",
    };
  }

  const warnings: string[] = [];
  if (!(cabinRows.length in CABIN_SEQUENCE_BY_COUNT)) {
    warnings.push(
      `${cabinRows.length} cabine(s) reconnue(s), ce qui est inhabituel (2, 3 ou 4 attendues) — vérifie les valeurs.`
    );
  }
  if (unrecognizedCount > 0) {
    warnings.push(`${unrecognizedCount} ligne(s) non reconnue(s) ignorée(s).`);
  }

  // Colonnes reconstruites à partir des nombres des lignes cabine
  // uniquement (pas l'en-tête, dont le texte est bien plus large que des
  // chiffres et fausserait le regroupement).
  const numericWordsByRow = cabinRows.map((r) => r.words.filter(isNumeric));
  const allNumericWords = numericWordsByRow.flat();
  const columns = cluster1D(allNumericWords, (w) => w.x0, (w) => w.x1).sort((a, b) => {
    const centerA = a.reduce((s, w) => s + (w.x0 + w.x1) / 2, 0) / a.length;
    const centerB = b.reduce((s, w) => s + (w.x0 + w.x1) / 2, 0) / b.length;
    return centerA - centerB;
  });

  if (columns.length !== 4) {
    return {
      error: `${columns.length} colonne(s) numérique(s) détectée(s) au lieu de 4 (Capacité/Ventes/Prévisions/Pad). Vérifie que la capture est nette et complète.`,
    };
  }

  // Ordre connu : Capacité, Ventes, Prévisions (ignorée), Pad. On garde les 4
  // centres (y compris Prévisions) pour l'appariement par plus proche
  // voisin : ne comparer qu'aux 3 colonnes retenues ferait "déborder" une
  // valeur de Prévisions vers Ventes ou Pad dès qu'elle leur est plus proche
  // que la vraie colonne Pad (constaté avec une vraie capture : la valeur
  // Prévisions écrasait Pad).
  const columnCenters = columns.map(
    (col) => col.reduce((s, w) => s + (w.x0 + w.x1) / 2, 0) / col.length
  );
  const [capacityX, soldX, previsionsX, padX] = columnCenters;

  const cabins: Record<string, CabinValues> = {};

  for (let i = 0; i < cabinRows.length; i++) {
    const { name } = cabinRows[i];
    const result: Partial<CabinValues> = {};
    for (const w of numericWordsByRow[i]) {
      const center = (w.x0 + w.x1) / 2;
      const distances: [keyof CabinValues | 'previsions', number][] = [
        ['capacity', Math.abs(center - capacityX)],
        ['sold', Math.abs(center - soldX)],
        ['previsions', Math.abs(center - previsionsX)],
        ['pad', Math.abs(center - padX)],
      ];
      distances.sort((a, b) => a[1] - b[1]);
      const col = distances[0][0];
      if (col === 'previsions') continue;
      if (result[col] === undefined) result[col] = parseInt(w.text.trim(), 10);
    }

    if (result.capacity == null || result.sold == null || result.pad == null) {
      const missing = (['capacity', 'sold', 'pad'] as const).filter((k) => result[k] == null);
      warnings.push(`${name} : colonne(s) ${missing.join(', ')} non lue(s) — ligne ignorée, à saisir à la main.`);
      continue;
    }
    cabins[name] = { capacity: result.capacity, sold: result.sold, pad: result.pad };
  }

  return { cabins, warnings };
}
