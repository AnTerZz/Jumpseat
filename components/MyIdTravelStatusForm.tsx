'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MyIdTravelStatus } from '@/lib/constants';
import MyIdTravelStatusPicker from './MyIdTravelStatusPicker';

export default function MyIdTravelStatusForm({
  flightId,
  currentStatus,
}: {
  flightId: string;
  currentStatus: MyIdTravelStatus | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<MyIdTravelStatus | null>(currentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-6 rounded-md border border-navy-line px-4 py-2 text-sm text-text-muted hover:text-amber"
      >
        {currentStatus ? '+ Mettre à jour le statut MyIdTravel' : '+ Renseigner le statut MyIdTravel'}
      </button>
    );
  }

  async function handleSave() {
    if (!status) {
      setError('Choisis un statut.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/flights/${flightId}/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ myidtravelStatus: status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erreur.');
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-navy-line bg-navy-panel p-4">
      <p className="mb-3 text-sm font-medium text-text-primary">Statut MyIdTravel</p>
      <MyIdTravelStatusPicker value={status} onChange={setStatus} />
      {error && <p className="mt-2 text-sm text-denied">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleSave}
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
    </div>
  );
}
