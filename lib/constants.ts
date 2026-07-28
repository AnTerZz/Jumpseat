// Nom affiché dans l'app — surchargeable via la variable d'environnement
// NEXT_PUBLIC_APP_NAME une fois le nom définitif choisi.
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Jump Seat';

// Ajuste cette liste selon les configurations cabine réelles AF / KLM
// (tu peux aussi la faire dépendre du type d'appareil si besoin plus tard).
export const CABIN_CLASSES = ['Economy', 'Premium Economy', 'Business', 'La Première'];

// Type de billet R2 acheté pour ce vol précis — détermine la logique de
// priorité/surclassement et sert de base à l'indice de difficulté (voir
// lib/difficulty.ts).
export const TICKET_TYPES = [
  { value: 'r2_eco', label: 'R2 Éco standard' },
  { value: 'r2_premium', label: 'R2 Premium' },
  { value: 'r2_business', label: 'R2 Business' },
  { value: 'r2s', label: 'R2S (vocation surclassement)' },
] as const;

// Niveau d'information disponible selon la compagnie : "rich" pour AF/KLM/
// Transavia (remplissage saisi manuellement par l'équipe), "basic" pour les
// autres compagnies (embarque/n'embarque pas + surclassement rare seulement).
export const DATA_TIERS = ['rich', 'basic'] as const;
export const RICH_TIER_AIRLINE_CODES = ['AF', 'KL', 'TO']; // Air France, KLM, Transavia

export const POINTS = {
  boardedCorrect: 10, // bon pronostic "embarque / n'embarque pas"
  classCorrect: 20, // bonne classe (seulement si l'embarquement était correct)
  seatsMaxPoints: 30, // pronostic exact du nombre de sièges restants
  seatsPenaltyPerSeat: 5, // pénalité par siège d'écart (min 0)
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
