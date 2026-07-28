// Petit graphique d'évolution, volontairement simple (pas de dépendance de
// charting) : un point par mise à jour de remplissage, échelle fixe 1-5.

export default function DifficultySparkline({
  points,
}: {
  points: { recordedAt: string; difficulty: number | null }[];
}) {
  const valid = points.filter((p) => p.difficulty != null);
  if (valid.length === 0) return null;

  const width = 280;
  const height = 64;
  const padding = 8;
  const min = 1;
  const max = 5;

  const coords = valid.map((p, i) => {
    const x = valid.length === 1 ? width / 2 : padding + (i / (valid.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((p.difficulty! - min) / (max - min)) * (height - 2 * padding);
    return [x, y] as const;
  });

  const points2d = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-xs">
        <polyline points={points2d} fill="none" stroke="#FFB627" strokeWidth={2} />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.5} fill="#FFB627" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-text-muted">
        <span>Facile</span>
        <span>Incertain</span>
      </div>
    </div>
  );
}
