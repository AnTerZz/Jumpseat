'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CABIN_CLASSES, POINTS } from '@/lib/constants';

export default function BetPanel({ flightId, existingBet }: { flightId: string; existingBet: any }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [boarded, setBoarded] = useState<boolean>(existingBet?.predicted_boarded ?? true);
  const [cabinClass, setCabinClass] = useState<string>(existingBet?.predicted_class ?? CABIN_CLASSES[0]);
  const [seats, setSeats] = useState<string>(existingBet?.predicted_seats_remaining?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (existingBet && !editing) {
    const nextPenaltyPct = Math.round((1 - Math.pow(1 - POINTS.betChangePenaltyPerEdit, existingBet.edit_count + 1)) * 100);
    return (
      <div className="mb-6 rounded-lg border border-navy-line bg-navy-panel p-4">
        <p className="mb-1 text-sm font-medium text-text-primary">Ton pronostic</p>
        <p className="text-text-primary">
          {existingBet.predicted_boarded
            ? `Embarque${existingBet.predicted_class ? ' · ' + existingBet.predicted_class : ''}${
                existingBet.predicted_seats_remaining != null
                  ? ' · ' + existingBet.predicted_seats_remaining + ' sièges restants'
                  : ''
              }`
            : "N'embarque pas"}
          {existingBet.edit_count > 0 ? ` (modifié ${existingBet.edit_count}x)` : ''}
        </p>
        <button
          onClick={() => setEditing(true)}
          className="mt-3 text-sm text-text-muted underline hover:text-amber"
        >
          Modifier mon pronostic (−{nextPenaltyPct}% sur les points de ce pari)
        </button>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flightId,
          predictedBoarded: boarded,
          predictedClass: boarded ? cabinClass : null,
          predictedSeatsRemaining: boarded && seats ? Number(seats) : null,
        }),
      });
      if (res.redirected) {
        setError('Session expirée : recharge la page et reconnecte-toi.');
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erreur.');
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError('Erreur de connexion. Réessaie.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-lg border-2 border-amber bg-navy-panel p-5 shadow-[0_0_24px_rgba(255,182,39,0.12)]"
    >
      <p className="mb-3 text-base font-semibold text-text-primary">
        {existingBet ? 'Modifier mon pronostic' : 'Placer mon pronostic'}
      </p>
      {existingBet && (
        <p className="mb-3 text-xs text-denied">
          Modifier un pronostic déjà posé réduit ses points : chaque modification coûte{' '}
          {Math.round(POINTS.betChangePenaltyPerEdit * 100)}% de plus (cumulatif).
        </p>
      )}
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setBoarded(true)}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
            boarded ? 'bg-boarded text-navy' : 'bg-navy text-text-muted'
          }`}
        >
          Embarque
        </button>
        <button
          type="button"
          onClick={() => setBoarded(false)}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
            !boarded ? 'bg-denied text-navy' : 'bg-navy text-text-muted'
          }`}
        >
          N&apos;embarque pas
        </button>
      </div>

      {boarded && (
        <div className="mb-3 grid grid-cols-2 gap-3">
          <select
            value={cabinClass}
            onChange={(e) => setCabinClass(e.target.value)}
            className="rounded-md border border-navy-line bg-navy px-3 py-2 text-text-primary"
          >
            {CABIN_CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            placeholder="Sièges restants"
            className="rounded-md border border-navy-line bg-navy px-3 py-2 text-text-primary placeholder:text-text-muted"
          />
        </div>
      )}

      {error && <p className="mb-2 text-sm text-denied">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-md bg-amber px-4 py-2 font-medium text-navy hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : existingBet ? 'Confirmer la modification' : 'Parier'}
        </button>
        {existingBet && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md px-4 py-2 text-sm text-text-muted hover:text-text-primary"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
