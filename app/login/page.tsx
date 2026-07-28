'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { APP_NAME } from '@/lib/constants';

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get('error'));
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        setError(error.message);
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 font-display text-3xl text-text-primary">{APP_NAME}</h1>
      <p className="mb-6 text-sm text-text-muted">Pronostiquez l&apos;embarquement de vos collègues.</p>

      {sent ? (
        <div className="rounded-lg border border-navy-line bg-navy-panel p-4">
          <p className="text-text-primary">
            Regarde ta boîte mail (<span className="font-mono">{email}</span>) et clique sur le lien
            de connexion.
          </p>
          <button
            onClick={() => setSent(false)}
            className="mt-3 text-sm text-text-muted underline hover:text-amber"
          >
            Mauvaise adresse ? Recommencer
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-text-muted">
              Adresse e-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@airfranceklm.com"
              className="w-full rounded-md border border-navy-line bg-navy-panel px-3 py-2 text-text-primary outline-none placeholder:text-text-muted focus:border-amber"
              required
            />
          </div>

          {error && <p className="text-sm text-denied">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-amber px-4 py-2 font-medium text-navy hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Envoi...' : 'Recevoir le lien de connexion'}
          </button>
          <p className="text-xs text-text-muted">
            Pas de mot de passe : on t&apos;envoie un lien à usage unique par e-mail.
          </p>
        </form>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
