// Outil de diagnostic ponctuel : lance tesseract.js sur une vraie image
// (tesseract.js fonctionne aussi bien en Node qu'au navigateur) et affiche
// tous les mots détectés avec leur position, puis le résultat du parsing —
// pour déboguer avec de vraies données plutôt qu'en devinant des
// coordonnées synthétiques. Reproduit le même prétraitement que
// RemplissagePasteBox.tsx (agrandissement 4x + whitelist de caractères) via
// sharp, l'équivalent Node du canvas utilisé côté navigateur. Usage :
//   npm run debug-remplissage-ocr -- chemin/vers/capture.png

import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { parseRemplissageWords, type OcrWord } from '../lib/remplissageOcr';

const OCR_CHAR_WHITELIST =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇàâäéèêëîïôöùûüÿç '";

function flattenTesseractWords(page: any): OcrWord[] {
  const words: OcrWord[] = [];
  for (const block of page?.blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        for (const word of line.words ?? []) {
          words.push({
            text: word.text,
            x0: word.bbox.x0,
            y0: word.bbox.y0,
            x1: word.bbox.x1,
            y1: word.bbox.y1,
          });
        }
      }
    }
  }
  return words;
}

async function main() {
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.error('Usage : npm run debug-remplissage-ocr -- chemin/vers/capture.png');
    process.exit(1);
  }

  console.log(`Lecture OCR de ${imagePath}...`);
  const metadata = await sharp(imagePath).metadata();
  const scale = 4;
  const upscaled = await sharp(imagePath)
    .resize({ width: (metadata.width ?? 0) * scale, kernel: 'cubic' })
    .toBuffer();

  const worker = await createWorker('eng');
  try {
    await worker.setParameters({ tessedit_char_whitelist: OCR_CHAR_WHITELIST });
    const { data } = await worker.recognize(upscaled, {}, { blocks: true });
    const words = flattenTesseractWords(data);

    console.log(`\n=== ${words.length} mot(s) détecté(s) (triés par position) ===`);
    const sorted = [...words].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
    for (const w of sorted) {
      console.log(
        `"${w.text}"`.padEnd(20) + `x0=${w.x0.toFixed(0)} x1=${w.x1.toFixed(0)} y0=${w.y0.toFixed(0)} y1=${w.y1.toFixed(0)}`
      );
    }

    console.log('\n=== Résultat de parseRemplissageWords ===');
    const parsed = parseRemplissageWords(words);
    console.log(JSON.stringify(parsed, null, 2));
  } finally {
    await worker.terminate();
  }
}

main();
