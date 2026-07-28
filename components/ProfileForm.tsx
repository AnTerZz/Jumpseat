'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileForm({
  initialPseudo,
  initialSeniorityDate,
  next,
}: {
  initialPseudo: string;
  initialSeniorityDate: string | null;
  next?: string;
}) {
  const router = useRouter();
  const [pseudo, setPseudo] = useState(initialPseudo);
  const [seniorityDate, setSeniorityDate] = useState(initialSeniorityDate ?? '');
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
        body: JSON.stringify({ pseudo, seniorityDate }),
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
