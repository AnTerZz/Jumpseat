'use client';

// Élément signature de l'appli : imite les panneaux à lamelles ("split-flap")
// des halls d'aéroport. Chaque caractère est remonté (donc réanimé) dès que
// la valeur affichée change, ce qui donne l'effet de bascule sans machine à
// états complexe.
export default function SplitFlap({ value }: { value: string }) {
  return (
    <span className="inline-flex gap-[2px]" aria-label={value}>
      {value.split('').map((char, i) => (
        <span
          key={`${value}-${i}`}
          className="split-flap-tile"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}
