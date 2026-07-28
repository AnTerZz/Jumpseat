import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/currentUser';
import { getSupabase } from '@/lib/supabaseServer';
import { requireLeagueMembership } from '@/lib/leagueAccess';
import { getFlightPhase } from '@/lib/flightPhase';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default async function LeagueCalendarPage({
  params,
  searchParams,
}: {
  params: { leagueId: string };
  searchParams: { month?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { league } = await requireLeagueMembership(params.leagueId, user.id);

  const now = new Date();
  const [year, month] = (searchParams.month ?? `${now.getFullYear()}-${pad(now.getMonth() + 1)}`)
    .split('-')
    .map(Number);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  const prevMonth = new Date(year, month - 2, 1);
  const nextMonth = new Date(year, month, 1);

  const supabase = getSupabase();
  const { data: flights } = await supabase
    .from('flights')
    .select('*')
    .eq('league_id', league.id)
    .gte('scheduled_departure', monthStart.toISOString())
    .lt('scheduled_departure', monthEnd.toISOString());

  const byDay: Record<string, any[]> = {};
  (flights ?? []).forEach((f: any) => {
    const key = f.scheduled_departure.slice(0, 10);
    byDay[key] = byDay[key] ?? [];
    byDay[key].push(f);
  });

  // Grille du mois, semaines commençant le lundi.
  const firstWeekday = (monthStart.getDay() + 6) % 7; // 0 = lundi
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = monthStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl capitalize text-text-primary">{monthLabel}</h1>
        <div className="flex gap-2">
          <Link
            href={`/l/${league.id}/calendar?month=${prevMonth.getFullYear()}-${pad(prevMonth.getMonth() + 1)}`}
            className="rounded-md border border-navy-line px-3 py-1.5 text-sm text-text-muted hover:text-amber"
          >
            ← Précédent
          </Link>
          <Link
            href={`/l/${league.id}/calendar?month=${nextMonth.getFullYear()}-${pad(nextMonth.getMonth() + 1)}`}
            className="rounded-md border border-navy-line px-3 py-1.5 text-sm text-text-muted hover:text-amber"
          >
            Suivant →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs uppercase tracking-wide text-text-muted">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          const key = day ? `${year}-${pad(month)}-${pad(day)}` : `empty-${i}`;
          const dayFlights = day ? (byDay[key] ?? []) : [];
          return (
            <div
              key={key}
              className={`min-h-[84px] rounded-md border border-navy-line p-1.5 ${
                day ? 'bg-navy-panel' : 'bg-transparent border-transparent'
              }`}
            >
              {day && <p className="mb-1 text-xs text-text-muted">{day}</p>}
              <div className="space-y-1">
                {dayFlights.map((f: any) => {
                  const phase = getFlightPhase(f);
                  const color =
                    phase === 'resolved'
                      ? f.actual_boarded
                        ? 'bg-boarded/20 text-boarded'
                        : 'bg-denied/20 text-denied'
                      : 'bg-amber/20 text-amber';
                  return (
                    <Link
                      key={f.id}
                      href={`/l/${league.id}/flights/${f.id}`}
                      className={`block truncate rounded px-1.5 py-0.5 font-mono text-[11px] ${color}`}
                    >
                      {f.flight_number}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
