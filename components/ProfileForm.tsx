'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileForm({
  initialPseudo,
  initialSeniorityDate,
  initialNotifyNewFlights,
  next,
}: {
  initialPseudo: string;
  initialSeniorityDate: string | null;
  initialNotifyNewFlights: boolean;
  next?: string;
}) {
  const router = useRouter();
  const [pseudo, setPseudo] = useState(initialPseudo);
  const [seniorityDate, setSeniorityDate] = useState(initialSeniorityDate ?? '');
  const [notifyNewFlights, setNotifyNewFlights] = useState(initialNotifyNewFlights);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo, seniorityDate, notifyNewFlights }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erreur.');
        return;
      }
      setSaved(true);
      if (next) {
        router.push(next);
      } else {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Pseudo</label>
        <input
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          className="w-full rounded-md border border-navy-line bg-navy-panel px-3 py-2 text-text-primary outline-none focus:border-amber"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase tracking-wide text-text-muted">
          Date d&apos;entrée en compagnie
        </label>
        <input
          type="date"
          value={seniorityDate}
          onChange={(e) => setSeniorityDate(e.target.value)}
          className="w-full rounded-md border border-navy-line bg-navy-panel px-3 py-2 text-text-primary outline-none focus:border-amber"
        />
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={notifyNewFlights}
        onClick={() => setNotifyNewFlights((v) => !v)}
        className="flex w-full items-center justify-between gap-4 rounded-md border border-navy-line bg-navy-panel px-3 py-3 text-left transition-colors hover:border-amber/50 focus:outline-none focus:ring-2 focus:ring-amber/50"
      >
        <div>
          <p className="text-sm font-medium text-text-primary">Digest quotidien des nouveaux vols</p>
          <p className="text-xs text-text-muted">
            Un e-mail par jour listant les vols postés dans tes ligues (aucun envoi s&apos;il n&apos;y
            a rien de nouveau).
          </p>
        </div>
        <span
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            notifyNewFlights ? 'bg-amber' : 'bg-navy-line'
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-text-primary shadow transition-transform ${
              notifyNewFlights ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </span>
      </button>

      {error && <p className="text-sm text-denied">{error}</p>}
      {saved && !error && <p className="text-sm text-boarded">Profil mis à jour.</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-amber px-4 py-2 font-medium text-navy hover:opacity-90 disabled:opacity-50"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </form>
  );
}
