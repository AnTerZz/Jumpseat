// Détection simplifiée des périodes de vacances scolaires françaises, pour
// le facteur "date du vol pendant les vacances ou non" de l'indice de
// difficulté (lib/difficulty.ts).
//
// Simplifications volontaires, à améliorer si besoin :
// - Union des zones A/B/C (on ne sait pas dans quelle zone habite chaque
//   joueur — pas de champ dédié aujourd'hui). Pour l'hiver et le printemps,
//   la période retenue va du début le plus précoce à la fin la plus tardive
//   parmi les 3 zones, donc elle est volontairement un peu large.
// - Ne couvre que l'année scolaire 2026-2027 (+ l'été 2026 en cours) à
//   partir des dates officielles du ministère de l'Éducation nationale. À
//   étendre chaque année (ajouter une entrée dans SCHOOL_HOLIDAY_RANGES).
//   Source : education.gouv.fr, calendrier scolaire 2026-2027.

type DateRange = { label: string; start: string; end: string }; // dates ISO (YYYY-MM-DD), inclusives

export const SCHOOL_HOLIDAY_RANGES: DateRange[] = [
  { label: 'Été 2026', start: '2026-07-04', end: '2026-08-31' },
  { label: 'Toussaint 2026', start: '2026-10-17', end: '2026-11-02' },
  { label: 'Noël 2026-2027', start: '2026-12-19', end: '2027-01-04' },
  { label: 'Hiver 2027 (union zones)', start: '2027-02-06', end: '2027-03-08' },
  { label: 'Printemps 2027 (union zones)', start: '2027-04-03', end: '2027-05-03' },
  { label: 'Été 2027 (approximatif, à ajuster)', start: '2027-07-03', end: '2027-08-31' },
];

export function isSchoolHoliday(date: Date | string): boolean {
  const d = typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10);
  return SCHOOL_HOLIDAY_RANGES.some((range) => d >= range.start && d <= range.end);
}
