import { CABIN_CLASSES } from '@/lib/constants';

export default function ConsensusBar({ bets }: { bets: any[] }) {
  if (bets.length === 0) {
    return <p className="text-sm text-text-muted">Pas encore de pronostic pour calculer une tendance.</p>;
  }

  const boardedCount = bets.filter((b) => b.predicted_boarded).length;
  const boardedPct = Math.round((boardedCount / bets.length) * 100);

  const classCounts = CABIN_CLASSES.map((cabin) => ({
    cabin,
    count: bets.filter((b) => b.predicted_boarded && b.predicted_class === cabin).length,
  })).filter((c) => c.count > 0);

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex justify-between text-xs text-text-muted">
          <span>Embarque</span>
          <span>{boardedPct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-navy">
          <div className="h-full bg-boarded" style={{ width: `${boardedPct}%` }} />
        </div>
      </div>

      {classCounts.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-text-muted">Classe pronostiquée (parmi ceux qui pensent qu&apos;il embarque)</p>
          {classCounts.map(({ cabin, count }) => (
            <div key={cabin} className="mb-1 flex items-center gap-2 text-xs text-text-muted">
              <span className="w-28 truncate">{cabin}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy">
                <div
                  className="h-full bg-teal"
                  style={{ width: `${Math.round((count / bets.length) * 100)}%` }}
                />
              </div>
              <span>{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
