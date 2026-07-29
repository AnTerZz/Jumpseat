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
            </>
          ) : (
            <Link href="/leagues" className="hover:text-amber">
              Mes ligues
            </Link>
          )}
          <Link href="/profile" className="hover:text-amber">
            Profil
          </Link>
          <button onClick={handleLogout} aria-label="Se déconnecter" title="Se déconnecter" className="text-text-muted hover:text-denied">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
