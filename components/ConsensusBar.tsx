import { CABIN_CLASSES } from '@/lib/constants';
import PieChart from './PieChart';

const CABIN_COLORS: Record<string, string> = {
  Business: '#FFB627',
  'Premium Economy': '#3DD6C7',
  Economy: '#3ECB7A',
};

export default function ConsensusBar({ bets }: { bets: any[] }) {
  if (bets.length === 0) {
    return <p className="text-sm text-text-muted">Pas encore de pronostic pour calculer une tendance.</p>;
  }

  const boardedCount = bets.filter((b) => b.predicted_boarded).length;
  const boardedPct = Math.round((boardedCount / bets.length) * 100);

  const classCounts = CABIN_CLASSES.map((cabin) => ({
    label: cabin,
    value: bets.filter((b) => b.predicted_boarded && b.predicted_class === cabin).length,
    color: CABIN_COLORS[cabin] ?? '#8792A6',
  })).filter((c) => c.value > 0);

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
          <p className="mb-2 text-xs text-text-muted">
            Classe pronostiquée (parmi ceux qui pensent qu&apos;il embarque)
          </p>
          <PieChart data={classCounts} />
        </div>
      )}
    </div>
  );
}
