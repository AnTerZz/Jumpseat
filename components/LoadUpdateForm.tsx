'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CABIN_CLASSES } from '@/lib/constants';

export default function LoadUpdateForm({ flightId }: { flightId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [seatsByCabin, setSeatsByCabin] = useState<Record<string, { sold: string; capacity: string }>>({});
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/flights/${flightId}/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatsByCabin: Object.fromEntries(
            Object.entries(seatsByCabin)
              .filter(([, v]) => v.sold !== '' || v.capacity !== '')
              .map(([k, v]) => [k, { sold: Number(v.sold || 0), capacity: Number(v.capacity || 0) }])
          ),
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erreur.');
        return;
      }
      setOpen(false);
      setSeatsByCabin({});
      setNote('');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-6 rounded-md border border-navy-line px-4 py-2 text-sm text-text-muted hover:text-amber"
      >
        + Mettre à jour le remplissage
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-navy-line bg-navy-panel p-4">
      <p className="mb-3 text-sm font-medium text-text-primary">Nouveau constat de remplissage</p>
      <table className="mb-3 w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="pb-1 font-normal">Cabine</th>
            <th className="pb-1 font-normal">Vendus</th>
            <th className="pb-1 font-normal">Capacité</th>
          </tr>
        </thead>
        <tbody>
          {CABIN_CLASSES.map((cabin) => (
            <tr key={cabin}>
              <td className="py-1 pr-2 text-text-primary">{cabin}</td>
              <td className="py-1 pr-2">
                <input
                  type="number"
                  min={0}
                  value={seatsByCabin[cabin]?.sold ?? ''}
                  onChange={(e) =>
                    setSeatsByCabin((prev) => ({ ...prev, [cabin]: { ...prev[cabin], sold: e.target.value } }))
                  }
                  className="w-full rounded-md border border-navy-line bg-navy px-2 py-1 text-text-primary"
                />
              </td>
              <td className="py-1">
                <input
                  type="number"
                  min={0}
                  value={seatsByCabin[cabin]?.capacity ?? ''}
                  onChange={(e) =>
                    setSeatsByCabin((prev) => ({ ...prev, [cabin]: { ...prev[cabin], capacity: e.target.value } }))
                  }
                  className="w-full rounded-md border border-navy-line bg-navy px-2 py-1 text-text-primary"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optionnel)"
        className="mb-3 w-full rounded-md border border-navy-line bg-navy px-3 py-2 text-text-primary placeholder:text-text-muted"
      />
      {error && <p className="mb-2 text-sm text-denied">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-amber px-4 py-2 font-medium text-navy hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-4 py-2 text-sm text-text-muted hover:text-text-primary"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
