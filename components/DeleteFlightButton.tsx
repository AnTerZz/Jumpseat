'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteFlightButton({ flightId, leagueId }: { flightId: string; leagueId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/flights/${flightId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erreur.');
        return;
      }
      router.push(`/l/${leagueId}`);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="text-xs text-text-muted hover:text-denied">
        Supprimer ce vol
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-md border border-denied/40 bg-denied/10 p-3">
      <p className="mb-2 text-sm text-text-primary">
        Supprimer définitivement ce vol et tous les pronostics associés ? Cette action est
        irréversible.
      </p>
      {error && <p className="mb-2 text-sm text-denied">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-md bg-denied px-3 py-1.5 text-sm font-medium text-navy hover:opacity-90 disabled:opacity-50"
        >
          {deleting ? 'Suppression...' : 'Confirmer la suppression'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-md px-3 py-1.5 text-sm text-text-muted hover:text-text-primary"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
