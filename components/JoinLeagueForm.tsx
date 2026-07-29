'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinLeagueForm() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/leagues/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
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
      router.push(`/l/${data.league.id}`);
    } catch {
      setError('Erreur de connexion. Réessaie.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={inviteCode}
        onChange={(e) => setInviteCode(e.target.value)}
        placeholder="Ex: a1b2c3d4"
        className="flex-1 rounded-md border border-navy-line bg-navy-panel px-3 py-2 font-mono text-text-primary outline-none placeholder:text-text-muted focus:border-amber"
        required
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-teal px-4 py-2 font-medium text-navy hover:opacity-90 disabled:opacity-50"
      >
        {saving ? '...' : 'Rejoindre'}
      </button>
      {error && <p className="text-sm text-denied">{error}</p>}
    </form>
  );
}
