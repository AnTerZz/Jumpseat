// Vérifie la logique de reconstruction lignes/colonnes (lib/remplissageOcr.ts)
// contre des données synthétiques imitant ce que tesseract.js renverrait pour
// des tableaux à 2, 3 et 4 cabines — indépendant de la fidélité OCR réelle,
// qui ne peut se tester qu'avec de vraies images. Usage : npm run test-remplissage-ocr

import { parseRemplissageWords, type OcrWord } from '../lib/remplissageOcr';

function word(text: string, x0: number, y0: number, w = 40, h = 20): OcrWord {
  return { text, x0, y0, x1: x0 + w, y1: y0 + h };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`ÉCHEC: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${message}`);
  }
}

// --- Cas à 3 cabines (comme la capture fournie) ---
const threeCabinWords: OcrWord[] = [
  word('Capacité', 200, 0),
  word('Ventes', 350, 0),
  word('Prévisions', 470, 0),
  word('Pad', 620, 0),

  word('Business', 100, 40),
  word('7', 250, 40),
  word('4', 380, 40),
  word('5', 500, 40),
  word('0', 630, 40),

  word('Premium', 100, 80),
  word('Economy', 160, 80),
  word('20', 245, 80),
  word('18', 375, 80),
  word('19', 495, 80),
  word('0', 630, 80),

  word('Economy', 100, 120),
  word('96', 245, 120),
  word('95', 375, 120),
  word('92', 495, 120),
  word('0', 630, 120),

  word('Total', 100, 160),
  word('Avion', 155, 160),
  word('123', 245, 160),
  word('117', 380, 160),
  word('116', 495, 160),
  word('0', 630, 160),
];

const result3 = parseRemplissageWords(threeCabinWords);
if ('error' in result3) {
  console.error('ÉCHEC: cas 3 cabines a renvoyé une erreur :', result3.error);
  process.exitCode = 1;
} else {
  assert(Object.keys(result3.cabins).length === 3, '3 cabines détectées');
  assert(result3.cabins['Business']?.capacity === 7, 'Business capacité = 7');
  assert(result3.cabins['Business']?.sold === 4, 'Business vendus = 4');
  assert(result3.cabins['Premium Economy']?.capacity === 20, 'Premium Economy capacité = 20');
  assert(result3.cabins['Economy']?.sold === 95, 'Economy vendus = 95');
  assert(result3.warnings.length === 0, 'pas de warning');
}

// --- Cas à 2 cabines (pas de Premium Economy) ---
const twoCabinWords: OcrWord[] = [
  word('Capacité', 200, 0),
  word('Ventes', 350, 0),
  word('Prévisions', 470, 0),
  word('Pad', 620, 0),

  word('Business', 100, 40),
  word('8', 250, 40),
  word('5', 380, 40),
  word('6', 500, 40),
  word('1', 630, 40),

  word('Economy', 100, 80),
  word('150', 245, 80),
  word('148', 375, 80),
  word('145', 495, 80),
  word('3', 630, 80),

  word('Total', 100, 120),
  word('Avion', 155, 120),
  word('158', 245, 120),
  word('153', 380, 120),
  word('151', 495, 120),
  word('4', 630, 120),
];

const result2 = parseRemplissageWords(twoCabinWords);
if ('error' in result2) {
  console.error('ÉCHEC: cas 2 cabines a renvoyé une erreur :', result2.error);
  process.exitCode = 1;
} else {
  assert(Object.keys(result2.cabins).length === 2, '2 cabines détectées');
  assert(!('Premium Economy' in result2.cabins), 'pas de Premium Economy');
  assert(result2.cabins['Economy']?.capacity === 150, 'Economy capacité = 150');
}

// --- Cas à 4 cabines (avec La Première) ---
const fourCabinWords: OcrWord[] = [
  word('Capacité', 200, 0),
  word('Ventes', 350, 0),
  word('Prévisions', 470, 0),
  word('Pad', 620, 0),

  word('La', 100, 40),
  word('Première', 130, 40),
  word('4', 250, 40),
  word('2', 380, 40),
  word('3', 500, 40),
  word('0', 630, 40),

  word('Business', 100, 80),
  word('30', 245, 80),
  word('25', 375, 80),
  word('27', 495, 80),
  word('1', 630, 80),

  word('Premium', 100, 120),
  word('Economy', 160, 120),
  word('40', 245, 120),
  word('35', 375, 120),
  word('37', 495, 120),
  word('0', 630, 120),

  word('Economy', 100, 160),
  word('200', 245, 160),
  word('190', 375, 160),
  word('195', 495, 160),
  word('5', 630, 160),

  word('Total', 100, 200),
  word('Avion', 155, 200),
  word('274', 245, 200),
  word('252', 380, 200),
  word('262', 495, 200),
  word('6', 630, 200),
];

const result4 = parseRemplissageWords(fourCabinWords);
if ('error' in result4) {
  console.error('ÉCHEC: cas 4 cabines a renvoyé une erreur :', result4.error);
  process.exitCode = 1;
} else {
  assert(Object.keys(result4.cabins).length === 4, '4 cabines détectées');
  assert(result4.cabins['La Première']?.capacity === 4, 'La Première capacité = 4');
  assert(result4.cabins['Business']?.capacity === 30, 'Business capacité = 30');
  assert(result4.warnings.length === 0, 'pas de warning');
}

// --- Bug réel signalé : Prévisions mal lue (mot manquant/garbled) sur la
// ligne Economy ne doit PAS invalider capacité/ventes/pad de cette ligne. ---
const missingForecastWords: OcrWord[] = [
  word('Capacité', 200, 0),
  word('Ventes', 350, 0),
  word('Prévisions', 470, 0),
  word('Pad', 620, 0),

  word('Business', 100, 40),
  word('7', 250, 40),
  word('4', 380, 40),
  word('5', 500, 40),
  word('0', 630, 40),

  // Economy : la colonne Prévisions est absente (OCR n'a rien reconnu à cette
  // position) — capacité/ventes/pad doivent quand même être extraits.
  word('Economy', 100, 80),
  word('96', 245, 80),
  word('95', 375, 80),
  word('0', 630, 80),

  word('Total', 100, 120),
  word('Avion', 155, 120),
  word('103', 245, 120),
  word('99', 380, 120),
  word('97', 495, 120),
  word('0', 630, 120),
];
const resultMissingForecast = parseRemplissageWords(missingForecastWords);
if ('error' in resultMissingForecast) {
  console.error('ÉCHEC: cas Prévisions manquante a renvoyé une erreur inattendue :', resultMissingForecast.error);
  process.exitCode = 1;
} else {
  assert(resultMissingForecast.cabins['Economy']?.capacity === 96, 'Economy capacité = 96 malgré Prévisions manquante');
  assert(resultMissingForecast.cabins['Economy']?.sold === 95, 'Economy vendus = 95 malgré Prévisions manquante');
  assert(resultMissingForecast.cabins['Economy']?.pad === 0, 'Economy pad = 0 malgré Prévisions manquante');
}

// --- Cas réel signalé : capture fournie (2 cabines, largeurs de mot
// proportionnelles au texte pour mieux imiter un vrai rendu — un "96" est
// plus large qu'un "7", contrairement à word() qui utilise une largeur
// fixe). C'est ce décalage de largeur/alignement qui causait le bug
// original (ancres basées sur l'en-tête plutôt que sur les nombres
// eux-mêmes). ---
function realisticWord(text: string, x0: number, y0: number): OcrWord {
  const w = Math.max(14, text.length * 11);
  return { text, x0, y0, x1: x0 + w, y1: y0 + 20 };
}

const realWorldWords: OcrWord[] = [
  realisticWord('Capacité', 230, 0),
  realisticWord('Ventes', 380, 0),
  realisticWord('Prévisions', 490, 0),
  realisticWord('Pad', 640, 0),

  realisticWord('Business', 100, 40),
  realisticWord('7', 255, 40),
  realisticWord('4', 400, 40),
  realisticWord('5', 515, 40),
  realisticWord('0', 650, 40),

  realisticWord('Economy', 100, 80),
  realisticWord('96', 250, 80),
  realisticWord('95', 395, 80),
  realisticWord('92', 510, 80),
  realisticWord('0', 650, 80),

  realisticWord('Total', 100, 120),
  realisticWord('Avion', 150, 120),
  realisticWord('103', 248, 120),
  realisticWord('99', 397, 120),
  realisticWord('97', 512, 120),
  realisticWord('0', 650, 120),
];

const resultReal = parseRemplissageWords(realWorldWords);
if ('error' in resultReal) {
  console.error('ÉCHEC: cas réel (capture fournie) a renvoyé une erreur :', resultReal.error);
  process.exitCode = 1;
} else {
  assert(Object.keys(resultReal.cabins).length === 2, 'cas réel : 2 cabines détectées');
  assert(resultReal.cabins['Business']?.capacity === 7, 'cas réel : Business capacité = 7');
  assert(resultReal.cabins['Business']?.sold === 4, 'cas réel : Business vendus = 4');
  assert(resultReal.cabins['Business']?.pad === 0, 'cas réel : Business pad = 0');
  assert(resultReal.cabins['Economy']?.capacity === 96, 'cas réel : Economy capacité = 96');
  assert(resultReal.cabins['Economy']?.sold === 95, 'cas réel : Economy vendus = 95');
  assert(resultReal.cabins['Economy']?.pad === 0, 'cas réel : Economy pad = 0');
}

// --- Bug réel signalé : une ligne fantôme (ex: puce/icône mal lue par
// l'OCR, comme les puces ovales de la capture) ne doit ni créer une
// "3e cabine" ni décaler Business/Economy. Elle doit juste être ignorée. ---
const phantomRowWords: OcrWord[] = [
  realisticWord('Capacité', 230, 0),
  realisticWord('Ventes', 380, 0),
  realisticWord('Prévisions', 490, 0),
  realisticWord('Pad', 640, 0),

  realisticWord('Business', 100, 40),
  realisticWord('7', 255, 40),
  realisticWord('4', 400, 40),
  realisticWord('5', 515, 40),
  realisticWord('0', 650, 40),

  // Ligne fantôme : juste une puce mal lue par l'OCR, ni en-tête, ni cabine,
  // ni total — doit être ignorée sans compter comme une cabine.
  realisticWord('©', 60, 78),

  realisticWord('Economy', 100, 80),
  realisticWord('96', 250, 80),
  realisticWord('95', 395, 80),
  realisticWord('92', 510, 80),
  realisticWord('0', 650, 80),

  realisticWord('Total', 100, 120),
  realisticWord('Avion', 150, 120),
  realisticWord('103', 248, 120),
  realisticWord('99', 397, 120),
  realisticWord('97', 512, 120),
  realisticWord('0', 650, 120),
];

const resultPhantom = parseRemplissageWords(phantomRowWords);
if ('error' in resultPhantom) {
  console.error('ÉCHEC: cas ligne fantôme a renvoyé une erreur inattendue :', resultPhantom.error);
  process.exitCode = 1;
} else {
  assert(Object.keys(resultPhantom.cabins).length === 2, 'ligne fantôme : toujours 2 cabines (pas 3)');
  assert(resultPhantom.cabins['Business']?.capacity === 7, 'ligne fantôme : Business capacité = 7');
  assert(resultPhantom.cabins['Economy']?.capacity === 96, 'ligne fantôme : Economy capacité = 96 (pas décalée)');
  assert(resultPhantom.cabins['Economy']?.sold === 95, 'ligne fantôme : Economy vendus = 95 (pas décalée)');
  assert(!('Premium Economy' in resultPhantom.cabins), 'ligne fantôme : pas de fausse "Premium Economy"');
}

if (process.exitCode === 1) {
  console.log('\n=== DES TESTS ONT ÉCHOUÉ ===');
} else {
  console.log('\n=== Tous les tests sont passés ===');
}
