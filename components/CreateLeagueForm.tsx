'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateLeagueForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      // Une session expirée fait rediriger l'API vers /login (par le
      // middleware) : la réponse suivie par fetch n'est alors plus du JSON.
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
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex: Escale CDG"
        className="flex-1 rounded-md border border-navy-line bg-navy-panel px-3 py-2 text-text-primary outline-none placeholder:text-text-muted focus:border-amber"
        required
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-amber px-4 py-2 font-medium text-navy hover:opacity-90 disabled:opacity-50"
      >
        {saving ? '...' : 'Créer'}
      </button>
      {error && <p className="text-sm text-denied">{error}</p>}
    </form>
  );
}
