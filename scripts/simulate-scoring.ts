// Simule le calcul de points sur des scénarios choisis, en appelant le vrai
// code de scoring (lib/points.ts + lib/boardingProbability.ts) — pas un
// recalcul à la main, pour être sûr que les chiffres affichés correspondent
// exactement à ce que l'app produirait. Usage : npm run simulate-scoring

import { computeBetPoints, type LoadSnapshotAtBetTime } from '../lib/points';
import { computePBoard, computePBoardForScoring } from '../lib/boardingProbability';
import type { TicketType, DataTier, SeatsByCabin } from '../lib/difficulty';

const DEPARTURE = new Date('2026-09-01T12:00:00Z');

function seniorityDateFromYears(years: number): string {
  const d = new Date(DEPARTURE);
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString();
}

type Scenario = {
  label: string;
  hoursBeforeDepartureAtBet: number;
  dataTier: DataTier;
  ticketType: TicketType | null;
  seatsByCabin: SeatsByCabin | null;
  r1Count: number | null;
  posterSeniorityYears: number;
  predictedBoarded: boolean;
  predictedClass: string | null;
  predictedSeatsRemaining: number | null;
  actualBoarded: boolean;
  actualClass: string | null;
  actualSeatsRemaining: number | null;
  editCount: number;
};

function run(scenario: Scenario) {
  const placedAt = new Date(DEPARTURE.getTime() - scenario.hoursBeforeDepartureAtBet * 3600 * 1000);
  const posterSeniorityDate = seniorityDateFromYears(scenario.posterSeniorityYears);

  const pBoardAtBet = computePBoard({
    ticketType: scenario.ticketType,
    dataTier: scenario.dataTier,
    seatsByCabin: scenario.seatsByCabin,
    r1Count: scenario.r1Count,
    posterSeniorityDate,
    scheduledDeparture: DEPARTURE,
    atTime: placedAt,
  });

  const bet = {
    user_id: 'u1',
    predicted_boarded: scenario.predictedBoarded,
    predicted_class: scenario.predictedClass,
    predicted_seats_remaining: scenario.predictedSeatsRemaining,
    placed_at: placedAt.toISOString(),
    edit_count: scenario.editCount,
  };
  const flight = {
    created_by: 'poster1',
    ticket_type: scenario.ticketType,
    data_tier: scenario.dataTier,
    scheduled_departure: DEPARTURE.toISOString(),
    actual_boarded: scenario.actualBoarded,
    actual_class: scenario.actualClass,
    actual_seats_remaining: scenario.actualSeatsRemaining,
  };
  const loadAtBetTime: LoadSnapshotAtBetTime = scenario.seatsByCabin
    ? { seats_by_cabin: scenario.seatsByCabin, r1_count: scenario.r1Count, myidtravel_status: null }
    : null;

  const pBoardForScoring = computePBoardForScoring({
    ticketType: scenario.ticketType,
    dataTier: scenario.dataTier,
    seatsByCabin: scenario.seatsByCabin,
    r1Count: scenario.r1Count,
    posterSeniorityDate,
    scheduledDeparture: DEPARTURE,
    atTime: placedAt,
  });

  const points = computeBetPoints(bet, flight, posterSeniorityDate, loadAtBetTime);

  console.log(
    `${scenario.label}\n` +
      `  P(board) affichée=${(pBoardAtBet * 100).toFixed(0)}%  amortie(scoring)=${(pBoardForScoring * 100).toFixed(0)}%  edits=${scenario.editCount}  -> ${points} pts`
  );
}

const FULL_CABIN = (sold: number, capacity: number, pad: number): SeatsByCabin => ({
  Business: { sold: capacity, capacity, pad: 0 },
  'Premium Economy': { sold: capacity, capacity, pad: 0 },
  Economy: { sold, capacity, pad },
});

console.log('=== 1. Favori (beaucoup de sièges), pari tôt, tout juste ===');
run({
  label: '14j avant, R2 Eco, Business/PremEco pleins, Eco: 25/30 restant, PAD 2, ancienneté 25 ans',
  hoursBeforeDepartureAtBet: 14 * 24,
  dataTier: 'rich',
  ticketType: 'r2_eco',
  seatsByCabin: FULL_CABIN(5, 30, 2),
  r1Count: 0,
  posterSeniorityYears: 25,
  predictedBoarded: true,
  predictedClass: 'Economy',
  predictedSeatsRemaining: 25,
  actualBoarded: true,
  actualClass: 'Economy',
  actualSeatsRemaining: 25,
  editCount: 0,
});

console.log('\n=== 2. Même scénario, sièges devinés à ±2 (crédit partiel) ===');
run({
  label: 'Idem #1 mais sièges prédits = 23 (écart de 2 sur tolérance 5)',
  hoursBeforeDepartureAtBet: 14 * 24,
  dataTier: 'rich',
  ticketType: 'r2_eco',
  seatsByCabin: FULL_CABIN(5, 30, 2),
  r1Count: 0,
  posterSeniorityYears: 25,
  predictedBoarded: true,
  predictedClass: 'Economy',
  predictedSeatsRemaining: 23,
  actualBoarded: true,
  actualClass: 'Economy',
  actualSeatsRemaining: 25,
  editCount: 0,
});

console.log('\n=== 3. Outsider (vol presque plein), correctement prédit "embarque" ===');
run({
  label: '14j avant, Eco: 29/30 vendus (1 restant), PAD 8, ancienneté 1 an',
  hoursBeforeDepartureAtBet: 14 * 24,
  dataTier: 'rich',
  ticketType: 'r2_eco',
  seatsByCabin: FULL_CABIN(29, 30, 8),
  r1Count: 0,
  posterSeniorityYears: 1,
  predictedBoarded: true,
  predictedClass: 'Economy',
  predictedSeatsRemaining: 1,
  actualBoarded: true,
  actualClass: 'Economy',
  actualSeatsRemaining: 1,
  editCount: 0,
});

console.log('\n=== 4. Même outsider, mais pari posé tardivement (H-1h) ===');
run({
  label: '1h avant (même remplissage), toujours ancienneté 1 an',
  hoursBeforeDepartureAtBet: 1,
  dataTier: 'rich',
  ticketType: 'r2_eco',
  seatsByCabin: FULL_CABIN(29, 30, 8),
  r1Count: 0,
  posterSeniorityYears: 1,
  predictedBoarded: true,
  predictedClass: 'Economy',
  predictedSeatsRemaining: 1,
  actualBoarded: true,
  actualClass: 'Economy',
  actualSeatsRemaining: 1,
  editCount: 0,
});

console.log('\n=== 5. Favori qui rate finalement l\'embarquement (pari faux) ===');
run({
  label: 'Prédit "embarque" (favori) mais finalement refusé',
  hoursBeforeDepartureAtBet: 14 * 24,
  dataTier: 'rich',
  ticketType: 'r2_eco',
  seatsByCabin: FULL_CABIN(5, 30, 2),
  r1Count: 0,
  posterSeniorityYears: 25,
  predictedBoarded: true,
  predictedClass: 'Economy',
  predictedSeatsRemaining: 25,
  actualBoarded: false,
  actualClass: null,
  actualSeatsRemaining: null,
  editCount: 0,
});

console.log('\n=== 6. "N\'embarque pas" prédit sur un favori qui échoue (contre les pronostics) ===');
run({
  label: 'Favori (peu probable de rater), pari "n\'embarque pas", et c\'est juste',
  hoursBeforeDepartureAtBet: 14 * 24,
  dataTier: 'rich',
  ticketType: 'r2_eco',
  seatsByCabin: FULL_CABIN(5, 30, 2),
  r1Count: 0,
  posterSeniorityYears: 25,
  predictedBoarded: false,
  predictedClass: null,
  predictedSeatsRemaining: null,
  actualBoarded: false,
  actualClass: null,
  actualSeatsRemaining: null,
  editCount: 0,
});

console.log('\n=== 7. "N\'embarque pas" prédit sur un outsider qui échoue (le pari "safe") ===');
run({
  label: 'Outsider (déjà peu probable d\'embarquer), pari "n\'embarque pas", et c\'est juste',
  hoursBeforeDepartureAtBet: 14 * 24,
  dataTier: 'rich',
  ticketType: 'r2_eco',
  seatsByCabin: FULL_CABIN(29, 30, 8),
  r1Count: 0,
  posterSeniorityYears: 1,
  predictedBoarded: false,
  predictedClass: null,
  predictedSeatsRemaining: null,
  actualBoarded: false,
  actualClass: null,
  actualSeatsRemaining: null,
  editCount: 0,
});

console.log('\n=== 8. Compagnie "basic" (pas de remplissage visible) ===');
run({
  label: 'Vol basic, pari tôt (14j), "embarque" juste',
  hoursBeforeDepartureAtBet: 14 * 24,
  dataTier: 'basic',
  ticketType: 'r2_eco',
  seatsByCabin: null,
  r1Count: null,
  posterSeniorityYears: 10,
  predictedBoarded: true,
  predictedClass: null,
  predictedSeatsRemaining: null,
  actualBoarded: true,
  actualClass: null,
  actualSeatsRemaining: null,
  editCount: 0,
});
run({
  label: 'Même vol basic, pari tardif (H-1h)',
  hoursBeforeDepartureAtBet: 1,
  dataTier: 'basic',
  ticketType: 'r2_eco',
  seatsByCabin: null,
  r1Count: null,
  posterSeniorityYears: 10,
  predictedBoarded: true,
  predictedClass: null,
  predictedSeatsRemaining: null,
  actualBoarded: true,
  actualClass: null,
  actualSeatsRemaining: null,
  editCount: 0,
});

console.log('\n=== 9. R2 Business, classe correcte ===');
run({
  label: 'R2 Business, Business: 3/8 restant, PAD 1, ancienneté 15 ans, classe+sièges exacts',
  hoursBeforeDepartureAtBet: 3 * 24,
  dataTier: 'rich',
  ticketType: 'r2_business',
  seatsByCabin: {
    Business: { sold: 5, capacity: 8, pad: 1 },
    'Premium Economy': { sold: 20, capacity: 20, pad: 0 },
    Economy: { sold: 100, capacity: 100, pad: 0 },
  },
  r1Count: 0,
  posterSeniorityYears: 15,
  predictedBoarded: true,
  predictedClass: 'Business',
  predictedSeatsRemaining: 3,
  actualBoarded: true,
  actualClass: 'Business',
  actualSeatsRemaining: 3,
  editCount: 0,
});

console.log('\n=== 10. EXTREME : plancher 5% correctement deviné "embarque" (plafond de cote) ===');
run({
  label: 'Très surbooké : Eco 30/30, PAD 15, ancienneté 0 an -> P(board) au plancher',
  hoursBeforeDepartureAtBet: 14 * 24,
  dataTier: 'rich',
  ticketType: 'r2_eco',
  seatsByCabin: FULL_CABIN(30, 30, 15),
  r1Count: 2,
  posterSeniorityYears: 0,
  predictedBoarded: true,
  predictedClass: 'Economy',
  predictedSeatsRemaining: 0,
  actualBoarded: true,
  actualClass: 'Economy',
  actualSeatsRemaining: 0,
  editCount: 0,
});

console.log('\n=== 11. EXTREME : plafond 95% correctement deviné "embarque" (quasi 1x) ===');
run({
  label: 'Vol quasi vide : Eco 2/50, PAD 0, ancienneté 30 ans -> P(board) au plafond',
  hoursBeforeDepartureAtBet: 14 * 24,
  dataTier: 'rich',
  ticketType: 'r2_eco',
  seatsByCabin: FULL_CABIN(2, 50, 0),
  r1Count: 0,
  posterSeniorityYears: 30,
  predictedBoarded: true,
  predictedClass: 'Economy',
  predictedSeatsRemaining: 48,
  actualBoarded: true,
  actualClass: 'Economy',
  actualSeatsRemaining: 48,
  editCount: 0,
});

console.log('\n=== 12. Impact des modifications de pari (même pari juste que le #1) ===');
for (const editCount of [0, 1, 2, 4]) {
  run({
    label: `Scénario #1 identique, modifié ${editCount}x`,
    hoursBeforeDepartureAtBet: 14 * 24,
    dataTier: 'rich',
    ticketType: 'r2_eco',
    seatsByCabin: FULL_CABIN(5, 30, 2),
    r1Count: 0,
    posterSeniorityYears: 25,
    predictedBoarded: true,
    predictedClass: 'Economy',
    predictedSeatsRemaining: 25,
    actualBoarded: true,
    actualClass: 'Economy',
    actualSeatsRemaining: 25,
    editCount,
  });
}

console.log('\n=== 13. Sièges devinés hors tolérance (0 crédit sièges, mais embarquement/classe ok) ===');
run({
  label: 'Sièges prédits 25, réels 5 (écart 20, tolérance 5) -> seatsTerm = 0',
  hoursBeforeDepartureAtBet: 14 * 24,
  dataTier: 'rich',
  ticketType: 'r2_eco',
  seatsByCabin: FULL_CABIN(5, 30, 2),
  r1Count: 0,
  posterSeniorityYears: 25,
  predictedBoarded: true,
  predictedClass: 'Economy',
  predictedSeatsRemaining: 25,
  actualBoarded: true,
  actualClass: 'Economy',
  actualSeatsRemaining: 5,
  editCount: 0,
});
