'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { APP_NAME } from '@/lib/constants';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(searchParams.get('error'));
  const [codeError, setCodeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

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

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    setCodeError(null);
    setVerifying(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error) {
        setCodeError(error.message);
        return;
      }
      router.push(next);
      router.refresh();
    } finally {
      setVerifying(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 font-display text-3xl text-text-primary">{APP_NAME}</h1>
      <p className="mb-6 text-sm text-text-muted">Pronostiquez l&apos;embarquement de vos collègues.</p>

      {sent ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-navy-line bg-navy-panel p-4">
            <p className="text-text-primary">
              Regarde ta boîte mail (<span className="font-mono">{email}</span>).
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-3 text-sm text-text-muted underline hover:text-amber"
            >
              Mauvaise adresse ? Recommencer
            </button>
          </div>

          <form onSubmit={handleVerifyCode} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-text-muted">
                Code reçu par e-mail
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-full rounded-md border border-navy-line bg-navy-panel px-3 py-2 font-mono text-lg tracking-widest text-text-primary outline-none placeholder:text-text-muted focus:border-amber"
                required
              />
            </div>
            {codeError && <p className="text-sm text-denied">{codeError}</p>}
            <button
              type="submit"
              disabled={verifying}
              className="w-full rounded-md bg-amber px-4 py-2 font-medium text-navy hover:opacity-90 disabled:opacity-50"
            >
              {verifying ? 'Vérification...' : 'Valider le code'}
            </button>
            <p className="text-xs text-text-muted">
              Tu peux aussi cliquer directement sur le lien reçu par e-mail : les deux fonctionnent.
            </p>
          </form>
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
              placeholder="name@domain.com"
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
            {loading ? 'Envoi...' : 'Recevoir un code de connexion'}
          </button>
          <p className="text-xs text-text-muted">
            Pas de mot de passe : on t&apos;envoie un code à usage unique par e-mail (et un lien
            en alternative).
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
