// Petit graphique d'évolution de P(embarque), même approche que
// DifficultySparkline (pas de dépendance de charting), échelle fixe 0-100%.

export default function PBoardSparkline({
  points,
}: {
  points: { recordedAt: string; pBoardPct: number | null }[];
}) {
  const valid = points.filter((p) => p.pBoardPct != null);
  if (valid.length === 0) return null;

  const width = 280;
  const height = 64;
  const padding = 8;
  const min = 0;
  const max = 100;

  const coords = valid.map((p, i) => {
    const x = valid.length === 1 ? width / 2 : padding + (i / (valid.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((p.pBoardPct! - min) / (max - min)) * (height - 2 * padding);
    return [x, y] as const;
  });

  const points2d = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-xs">
        <polyline points={points2d} fill="none" stroke="#3DD6C7" strokeWidth={2} />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.5} fill="#3DD6C7" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-text-muted">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
