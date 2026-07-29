'use client';

import { useState, type ClipboardEvent } from 'react';
import { parseRemplissageWords, type OcrWord } from '@/lib/remplissageOcr';

// Aplati la structure imbriquée de tesseract.js (blocks -> paragraphs ->
// lines -> words) en une liste de mots avec position — lib/remplissageOcr.ts
// reste ainsi indépendant de tesseract.js et testable sans lui.
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

// Les captures d'écran du remplissage sont petites (~150px de haut pour 3-4
// lignes), avec des chiffres d'à peine 11px de haut : trop fin pour que
// tesseract les lise fiablement (constaté : "96"/"92" lus comme "9%"/"E)").
// Un agrandissement par 4 avant l'OCR corrige ça, vérifié sur une vraie
// capture (voir scripts/debug-remplissage-ocr.ts).
async function upscaleImage(file: File | Blob, scale = 4): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width * scale;
  canvas.height = bitmap.height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D non disponible');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Échec de conversion du canvas en image'));
    }, 'image/png');
  });
}

// Empêche tesseract de choisir des symboles impossibles dans ce tableau
// (%, ), etc.) à la place du chiffre le plus proche visuellement — réduit
// les confusions comme "6" -> "%" ou "2" -> ")".
const OCR_CHAR_WHITELIST =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇàâäéèêëîïôöùûüÿç '";

type CabinFields = { sold: string; capacity: string; pad: string };

export default function RemplissagePasteBox({
  cabinClasses,
  onExtracted,
}: {
  cabinClasses: string[];
  onExtracted: (data: Record<string, CabinFields>) => void;
}) {
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handlePaste(e: ClipboardEvent<HTMLDivElement>) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
    if (!item) return; // pas une image collée, on laisse le comportement par défaut (texte, etc.)
    e.preventDefault();

    const file = item.getAsFile();
    if (!file) return;

    setStatus('processing');
    setMessage('Lecture de la capture en cours...');

    try {
      const { createWorker } = await import('tesseract.js');
      const upscaled = await upscaleImage(file);
      const worker = await createWorker('eng');
      try {
        await worker.setParameters({ tessedit_char_whitelist: OCR_CHAR_WHITELIST });
        const { data } = await worker.recognize(upscaled, {}, { blocks: true });
        const words = flattenTesseractWords(data);
        const parsed = parseRemplissageWords(words);

        if ('error' in parsed) {
          setStatus('error');
          setMessage(parsed.error);
          return;
        }

        // Une cabine attendue par l'app (ex: Premium Economy) mais absente
        // de la capture (avion qui ne l'a pas) est mise à 0/0/0 plutôt que
        // laissée vide — l'utilisateur n'a rien à saisir pour elle.
        const relevant: Record<string, CabinFields> = {};
        const zeroFilled: string[] = [];
        for (const cabin of cabinClasses) {
          const values = parsed.cabins[cabin];
          if (values) {
            relevant[cabin] = {
              sold: String(values.sold),
              capacity: String(values.capacity),
              pad: String(values.pad),
            };
          } else {
            relevant[cabin] = { sold: '0', capacity: '0', pad: '0' };
            zeroFilled.push(cabin);
          }
        }

        const ignored = Object.keys(parsed.cabins).filter((cabin) => !cabinClasses.includes(cabin));

        onExtracted(relevant);

        const notes = [...parsed.warnings];
        if (zeroFilled.length > 0) {
          notes.push(`${zeroFilled.join(', ')} absente(s) de la capture (avion sans cette cabine) : mise(s) à 0.`);
        }
        if (ignored.length > 0) {
          notes.push(`${ignored.join(', ')} ignoré(s) (non suivi par l'app).`);
        }
        setStatus('done');
        setMessage(
          `Valeurs extraites pour ${Object.keys(relevant).length} cabine(s) — vérifie avant d'enregistrer.` +
            (notes.length > 0 ? ' ' + notes.join(' ') : '')
        );
      } finally {
        await worker.terminate();
      }
    } catch (err) {
      setStatus('error');
      setMessage("Échec de la lecture de l'image. Réessaie ou saisis les valeurs à la main.");
    }
  }

  return (
    <div className="mb-3">
      <div
        tabIndex={0}
        onPaste={handlePaste}
        className="cursor-text rounded-md border border-dashed border-navy-line px-3 py-3 text-center text-xs text-text-muted outline-none focus:border-teal"
      >
        {status === 'processing'
          ? 'Lecture de la capture en cours...'
          : 'Clique ici puis Ctrl+V pour coller une capture du remplissage (Air France)'}
      </div>
      <p className="mt-1 text-xs text-text-muted">
        Colle le tableau de remplissage en entier (toutes les cabines, jusqu&apos;à la ligne Total Avion), et une seule capture pour ce vol.
      </p>
      {message && (
        <p className={`mt-1 text-xs ${status === 'error' ? 'text-denied' : 'text-teal'}`}>{message}</p>
      )}
    </div>
  );
}
