'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CABIN_CLASSES } from '@/lib/constants';

export default function BetPanel({ flightId, existingBet }: { flightId: string; existingBet: any }) {
  const router = useRouter();
  const [boarded, setBoarded] = useState<boolean>(existingBet?.predicted_boarded ?? true);
  const [cabinClass, setCabinClass] = useState<string>(existingBet?.predicted_class ?? CABIN_CLASSES[0]);
  const [seats, setSeats] = useState<string>(existingBet?.predicted_seats_remaining?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (existingBet) {
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
        </p>
        <p className="mt-2 text-xs text-text-muted">
          Les pronostics ne sont pas modifiables une fois posés.
        </p>
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
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erreur.');
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-navy-line bg-navy-panel p-4">
      <p className="mb-3 text-sm font-medium text-text-primary">Placer mon pronostic</p>
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

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-md bg-amber px-4 py-2 font-medium text-navy hover:opacity-90 disabled:opacity-50"
      >
        {saving ? 'Enregistrement...' : 'Parier'}
      </button>
    </form>
  );
}
