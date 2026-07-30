import { POINTS } from '@/lib/constants';
import type { BetPointsBreakdown } from '@/lib/points';

// Détail visuel du calcul des points d'un pari résolu — chaque terme de la
// formule (voir lib/points.ts / SCORING.md) affiché avec sa valeur, son
// poids et sa contribution, pour que le flux "de l'estimation aux points"
// soit lisible sans avoir à lire le code.

function Term({
  label,
  detail,
  weight,
  term,
  contribution,
  accent,
}: {
  label: string;
  detail: string;
  weight: number;
  term: number;
  contribution: number;
  accent: 'teal' | 'amber' | 'boarded' | 'muted';
}) {
  const labelColor = {
    teal: 'text-teal',
    amber: 'text-amber',
    boarded: 'text-boarded',
    muted: 'text-text-muted',
  }[accent];

  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div>
        <p className={`text-xs font-semibold ${labelColor}`}>{label}</p>
        <p className="text-xs text-text-muted">{detail}</p>
      </div>
      <p className="whitespace-nowrap font-mono text-xs text-text-muted">
        {weight.toFixed(2)} × {term.toFixed(2)} ={' '}
        <span className="text-text-primary">{contribution.toFixed(2)}</span>
      </p>
    </div>
  );
}

export default function PointsBreakdown({ bd }: { bd: BetPointsBreakdown }) {
  if (!bd.boardedCorrect) {
    return (
      <div className="mt-2 rounded-md border border-denied/30 bg-denied/10 px-3 py-2">
        <p className="text-xs font-semibold text-denied">Pronostic d&apos;embarquement faux</p>
        <p className="text-xs text-text-muted">
          Aucun autre critère ne compte quand l&apos;embarquement est mal deviné.
        </p>
        <p className="mt-1 text-sm font-semibold text-text-primary">= 0 pt</p>
      </div>
    );
  }

  const boardContribution = POINTS.boardWeight * bd.boardTerm;
  const classContribution = POINTS.classWeight * bd.classTerm;
  const seatsContribution = POINTS.seatsWeight * bd.seatsTerm;
  const subtotal = boardContribution + classContribution + seatsContribution;
  // bracketBeforePenalty = subtotal × timeMultiplier (voir lib/points.ts) —
  // réutilisé tel quel plutôt que recalculé, pour rester fidèle au chiffre
  // qui a réellement servi au calcul des points.
  const afterTimeMultiplier = bd.bracketBeforePenalty;
  const afterEditPenalty = afterTimeMultiplier * bd.editPenaltyFactor;

  return (
    <div className="mt-2 rounded-md border border-navy-line bg-navy px-3 py-2">
      <div className="divide-y divide-navy-line/60">
        <Term
          label="Embarquement"
          detail={`Correct · P estimée ${Math.round((bd.outcomeProbability ?? 0) * 100)}% → cote ×${bd.boardTerm.toFixed(2)}`}
          weight={POINTS.boardWeight}
          term={bd.boardTerm}
          contribution={boardContribution}
          accent="teal"
        />
        {bd.classCorrect != null && (
          <Term
            label="Classe"
            detail={
              bd.classCorrect
                ? 'Correcte · P fixe 33% → cote ×' + bd.classTerm.toFixed(2)
                : 'Incorrecte → aucune cote'
            }
            weight={POINTS.classWeight}
            term={bd.classTerm}
            contribution={classContribution}
            accent={bd.classCorrect ? 'amber' : 'muted'}
          />
        )}
        {bd.seatsDiff != null && (
          <Term
            label="Sièges restants"
            detail={`Écart de ${bd.seatsDiff} (tolérance ${POINTS.seatsTolerance}) → crédit ${Math.round(bd.seatsTerm * 100)}%`}
            weight={POINTS.seatsWeight}
            term={bd.seatsTerm}
            contribution={seatsContribution}
            accent={bd.seatsTerm > 0 ? 'boarded' : 'muted'}
          />
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between border-t border-navy-line pt-1.5 text-xs text-text-muted">
        <span>Sous-total</span>
        <span className="font-mono text-text-primary">{subtotal.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>× Multiplicateur temporel (délai avant décollage)</span>
        <span className="font-mono text-text-primary">
          ×{bd.timeMultiplier} = {afterTimeMultiplier.toFixed(2)}
        </span>
      </div>
      {bd.editCount > 0 && (
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>× Pénalité modification ({bd.editCount}x)</span>
          <span className="font-mono text-text-primary">
            ×{bd.editPenaltyFactor.toFixed(2)} = {afterEditPenalty.toFixed(2)}
          </span>
        </div>
      )}

      <div className="mt-1.5 flex items-center justify-between border-t border-navy-line pt-1.5">
        <span className="text-sm font-semibold text-text-primary">Total (arrondi)</span>
        <span className="text-lg font-bold text-amber">{bd.finalPoints} pts</span>
      </div>
    </div>
  );
}
