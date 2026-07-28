'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CABIN_CLASSES } from '@/lib/constants';

export default function ResolvePanel({ flightId }: { flightId: string }) {
  const router = useRouter();
  const [boarded, setBoarded] = useState(true);
  const [cabinClass, setCabinClass] = useState(CABIN_CLASSES[0]);
  const [seats, setSeats] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/flights/${flightId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualBoarded: boarded,
          actualClass: boarded ? cabinClass : null,
          actualSeatsRemaining: boarded && seats ? Number(seats) : null,
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
    <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-amber/40 bg-navy-panel p-4">
      <p className="mb-3 text-sm font-medium text-amber">
        Renseigner le résultat réel (calcule les points de tout le monde)
      </p>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setBoarded(true)}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
            boarded ? 'bg-boarded text-navy' : 'bg-navy text-text-muted'
          }`}
        >
          J&apos;ai embarqué
        </button>
        <button
          type="button"
          onClick={() => setBoarded(false)}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
            !boarded ? 'bg-denied text-navy' : 'bg-navy text-text-muted'
          }`}
        >
          Refusé
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
            placeholder="Sièges restants réels"
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
        {saving ? 'Calcul des points...' : 'Valider le résultat'}
      </button>
    </form>
  );
}
