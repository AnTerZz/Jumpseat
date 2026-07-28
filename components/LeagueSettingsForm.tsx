'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LeagueSettingsForm({
  leagueId,
  initialShowConsensus,
}: {
  leagueId: string;
  initialShowConsensus: boolean;
}) {
  const router = useRouter();
  const [showConsensus, setShowConsensus] = useState(initialShowConsensus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    const next = !showConsensus;
    setShowConsensus(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/leagues/${leagueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showConsensus: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erreur.');
        setShowConsensus(!next);
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-navy-line bg-navy-panel p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-primary">Sagesse collective</p>
          <p className="text-xs text-text-muted">
            Affiche la répartition des pronostics de tout le monde sur chaque vol.
          </p>
        </div>
        <button
          onClick={handleToggle}
          disabled={saving}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            showConsensus ? 'bg-amber' : 'bg-navy-line'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-navy transition-transform ${
              showConsensus ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-denied">{error}</p>}
    </div>
  );
}
