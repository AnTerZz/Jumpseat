// Même approche que PBoardSparkline (SVG à la main, pas de dépendance de
// charting), mais échelle auto-adaptée aux valeurs plutôt que fixe 0-100 —
// des points cumulés n'ont pas de borne connue à l'avance.

export default function PointsTrendSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;

  const width = 280;
  const height = 64;
  const padding = 8;
  const min = Math.min(0, ...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((v - min) / range) * (height - 2 * padding);
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
        <span>{Math.round(min)} pts</span>
        <span>{Math.round(max)} pts</span>
      </div>
    </div>
  );
}
