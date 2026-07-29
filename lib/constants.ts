// Nom affiché dans l'app — surchargeable via la variable d'environnement
// NEXT_PUBLIC_APP_NAME une fois le nom définitif choisi.
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Jump Seat';

// Ajuste cette liste selon les configurations cabine réelles AF
// (tu peux aussi la faire dépendre du type d'appareil si besoin plus tard).
export const CABIN_CLASSES = ['Business', 'Premium Economy', 'Economy'];

// Transavia (TO) ne vend que de l'Économie : pas de Business/Premium.
export function getCabinClasses(airlineCode: string | null | undefined): string[] {
  if (airlineCode?.toUpperCase() === 'TO') return ['Economy'];
  return CABIN_CLASSES;
}

// Type de billet R2 acheté pour ce vol précis — détermine la logique de
// priorité/surclassement et sert de base à l'indice de difficulté (voir
// lib/difficulty.ts).
export const TICKET_TYPES = [
  { value: 'r2_eco', label: 'R2 Éco standard' },
  { value: 'r2_premium', label: 'R2 Premium' },
  { value: 'r2_business', label: 'R2 Business' },
  { value: 'r2s', label: 'R2S (vocation surclassement)' },
] as const;

// Niveau d'information disponible selon la compagnie : "rich" pour AF et
// Transavia (remplissage saisi manuellement par l'équipe), "basic" pour les
// autres compagnies (KLM y compris) — embarque/n'embarque pas + surclassement
// rare seulement.
export const DATA_TIERS = ['rich', 'basic'] as const;
export const RICH_TIER_AIRLINE_CODES = ['AF', 'TO']; // Air France, Transavia

// Barème : points = TimeMultiplier x (boardWeight x BoardOddsTerm +
// classWeight x ClassTerm + seatsWeight x SeatsTerm), 0 si le pronostic
// d'embarquement est faux (voir SCORING.md pour le détail de la formule et
// le statut de chaque constante ci-dessous — best-guess en attendant un
// modèle fitté sur des données réelles).
//
// Plafond théorique fixé à 100 : TimeMultiplier max (3, voir
// TIME_MULTIPLIER_TIERS) x (boardWeight x oddsCap + classWeight x (1/CLASS_PROBABILITY)
// + seatsWeight) = 100. classWeight a été réduit (3.0303 -> 1.0101) quand
// ClassTerm est passé de "bonus plat" à "cote sur P(classe)=1/3 fixe" — sa
// propre valeur max ayant triplé (1 -> 3), on divise le poids par 3 pour
// garder la même part du plafond qu'avant.
export const POINTS = {
  boardWeight: 4.5455, // "a" — BoardOddsTerm = 1/P(issue), pondéré par le modèle de probabilité
  classWeight: 1.0101, // "b" — cote sur P(classe) fixe = 1/3 (voir CLASS_PROBABILITY), 0 si faux
  seatsWeight: 3.0303, // "c" — bonus plat pondéré par la précision (PSeats pas encore modélisée)
  oddsCap: 6, // plafond de 1/P, pour éviter un score démesuré sur une estimation extrême
  seatsTolerance: 5, // écart de sièges au-delà duquel il n'y a plus de crédit partiel
  // Modifier un pari déjà posé coûte cher : facteur multiplicatif composé
  // par modification (1 modif -> x0.85, 2 -> x0.7225, ...). Dissuade
  // l'indécision sans l'interdire complètement.
  betChangePenaltyPerEdit: 0.15,
  // Pas de bonus pour avoir posté un vol : seuls les pronostics rapportent
  // des points. Pas de malus non plus pour un pari sur son propre vol :
  // confirmé que le posteur n'a pas d'avantage d'information particulier
  // sur l'issue de son GP.
};

// Multiplicateur selon le délai entre le pari et le décollage :
// plus c'est posé tôt, plus c'est risqué (moins d'infos sur le remplissage),
// donc plus ça rapporte.
export const TIME_MULTIPLIER_TIERS = [
  { minDays: 14, multiplier: 3 },
  { minDays: 3, multiplier: 2 },
  { minDays: 1, multiplier: 1.5 },
  { minDays: 0, multiplier: 1 },
];
