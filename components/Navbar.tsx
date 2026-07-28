'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { APP_NAME } from '@/lib/constants';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login') return null;

  const leagueMatch = pathname.match(/^\/l\/([^/]+)/);
  const leagueId = leagueMatch?.[1];

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="border-b border-navy-line bg-navy-panel">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/leagues" className="font-display text-lg text-text-primary">
          {APP_NAME}
        </Link>
        <div className="flex items-center gap-4 text-sm text-text-muted">
          {leagueId ? (
            <>
              <Link href={`/l/${leagueId}`} className="hover:text-amber">
                Vols
              </Link>
              <Link href={`/l/${leagueId}/calendar`} className="hover:text-amber">
                Calendrier
              </Link>
              <Link href={`/l/${leagueId}/leaderboard`} className="hover:text-amber">
                Classement
              </Link>
              <Link href={`/l/${leagueId}/flights/new`} className="hover:text-amber">
                Poster
              </Link>
              <Link href={`/l/${leagueId}/settings`} className="hover:text-amber">
                Réglages
              </Link>
              <Link href="/leagues" className="hover:text-amber">
                Mes ligues
              </Link>
            </>
          ) : (
            <Link href="/leagues" className="hover:text-amber">
              Mes ligues
            </Link>
          )}
          <Link href="/profile" className="hover:text-amber">
            Profil
          </Link>
          <button onClick={handleLogout} className="hover:text-denied">
            Se déconnecter
          </button>
        </div>
      </div>
    </nav>
  );
}
