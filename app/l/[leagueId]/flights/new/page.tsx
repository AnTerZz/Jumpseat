'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CABIN_CLASSES, TICKET_TYPES } from '@/lib/constants';
import { getDataTier } from '@/lib/difficulty';

export default function NewFlightPage({ params }: { params: { leagueId: string } }) {
  const router = useRouter();
  const [flightNumber, setFlightNumber] = useState('');
  const [date, setDate] = useState('');
  const [info, setInfo] = useState<any>(null);
  const [ticketType, setTicketType] = useState<string>(TICKET_TYPES[0].value);
  const [seatsByCabin, setSeatsByCabin] = useState<
    Record<string, { sold: string; capacity: string; pad: string }>
  >({});
  const [r1Count, setR1Count] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await fetch('/api/flights/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flightNumber, date }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Vol introuvable.');
        return;
      }
      setInfo(data);
    } finally {
      setLoading(false);
    }
  }

  const dataTier = info ? getDataTier(info.airlineCode) : 'basic';

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/flights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: params.leagueId,
          flightNumber: info.flightNumber,
          flightDate: date,
          origin: info.origin,
          destination: info.destination,
          scheduledDeparture: info.scheduledDeparture,
          aircraftType: info.aircraftType,
          airlineCode: info.airlineCode,
          ticketType: dataTier === 'rich' ? ticketType : TICKET_TYPES[0].value,
          seatsByCabin:
            dataTier === 'rich'
              ? Object.fromEntries(
                  Object.entries(seatsByCabin)
                    .filter(([, v]) => v.sold !== '' || v.capacity !== '' || v.pad !== '')
                    .map(([k, v]) => [
                      k,
                      { sold: Number(v.sold || 0), capacity: Number(v.capacity || 0), pad: Number(v.pad || 0) },
                    ])
                )
              : null,
          r1Count: dataTier === 'rich' && r1Count !== '' ? Number(r1Count) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Impossible de créer le vol.');
        return;
      }
      router.push(`/l/${params.leagueId}/flights/${data.flight.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 font-display text-2xl text-text-primary">Poster un vol</h1>

      <form onSubmit={handleLookup} className="mb-6 flex gap-2">
        <input
          value={flightNumber}
          onChange={(e) => setFlightNumber(e.target.value)}
          placeholder="Ex: AF1680"
          className="flex-1 rounded-md border border-navy-line bg-navy-panel px-3 py-2 text-text-primary outline-none placeholder:text-text-muted focus:border-amber"
          required
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-navy-line bg-navy-panel px-3 py-2 text-text-primary outline-none focus:border-amber"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-teal px-4 py-2 font-medium text-navy hover:opacity-90 disabled:opacity-50"
        >
          {loading ? '...' : 'Chercher'}
        </button>
      </form>

      <p className="mb-4 text-xs text-text-muted">
        Un vol ne peut être posté que s&apos;il décolle dans au moins 24h, pour laisser le temps
        aux collègues de parier.
      </p>

      {error && <p className="mb-4 text-sm text-denied">{error}</p>}

      {info && (
        <div className="space-y-4 rounded-lg border border-navy-line bg-navy-panel p-4">
          <div>
            <p className="mb-2 font-mono text-lg text-text-primary">{info.flightNumber}</p>
            <p className="mb-1 text-text-primary">
              {info.origin ?? '?'} → {info.destination ?? '?'}
            </p>
            <p className="mb-1 text-text-muted">
              Départ prévu :{' '}
              {info.scheduledDeparture ? new Date(info.scheduledDeparture).toLocaleString('fr-FR') : 'inconnu'}
            </p>
            <p className="text-text-muted">Appareil : {info.aircraftType ?? 'inconnu'}</p>
          </div>

          {dataTier === 'rich' ? (
            <>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-text-muted">
                  Type de billet R2
                </label>
                <select
                  value={ticketType}
                  onChange={(e) => setTicketType(e.target.value)}
                  className="w-full rounded-md border border-navy-line bg-navy px-3 py-2 text-text-primary"
                >
                  {TICKET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-text-muted">
                  Remplissage constaté maintenant
                </label>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-text-muted">
                      <th className="pb-1 font-normal">Cabine</th>
                      <th className="pb-1 font-normal">Vendus</th>
                      <th className="pb-1 font-normal">Capacité</th>
                      <th className="pb-1 font-normal">PAD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CABIN_CLASSES.map((cabin) => (
                      <tr key={cabin}>
                        <td className="py-1 pr-2 text-text-primary">{cabin}</td>
                        <td className="py-1 pr-2">
                          <input
                            type="number"
                            min={0}
                            value={seatsByCabin[cabin]?.sold ?? ''}
                            onChange={(e) =>
                              setSeatsByCabin((prev) => ({
                                ...prev,
                                [cabin]: { ...prev[cabin], sold: e.target.value },
                              }))
                            }
                            className="w-full rounded-md border border-navy-line bg-navy px-2 py-1 text-text-primary"
                          />
                        </td>
                        <td className="py-1 pr-2">
                          <input
                            type="number"
                            min={0}
                            value={seatsByCabin[cabin]?.capacity ?? ''}
                            onChange={(e) =>
                              setSeatsByCabin((prev) => ({
                                ...prev,
                                [cabin]: { ...prev[cabin], capacity: e.target.value },
                              }))
                            }
                            className="w-full rounded-md border border-navy-line bg-navy px-2 py-1 text-text-primary"
                          />
                        </td>
                        <td className="py-1">
                          <input
                            type="number"
                            min={0}
                            value={seatsByCabin[cabin]?.pad ?? ''}
                            onChange={(e) =>
                              setSeatsByCabin((prev) => ({
                                ...prev,
                                [cabin]: { ...prev[cabin], pad: e.target.value },
                              }))
                            }
                            className="w-full rounded-md border border-navy-line bg-navy px-2 py-1 text-text-primary"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-1 text-xs text-text-muted">
                  Obligatoire pour Air France / KLM / Transavia, pour donner une base aux autres
                  joueurs et calculer l&apos;indice de difficulté. Laisse à 0 ce que tu ne connais pas.
                  PAD = nombre de standby en attente sur cette cabine.
                </p>

                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wide text-text-muted">
                    Nombre de R1
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={r1Count}
                    onChange={(e) => setR1Count(e.target.value)}
                    placeholder="0"
                    className="w-32 rounded-md border border-navy-line bg-navy px-2 py-1 text-text-primary placeholder:text-text-muted"
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    Les R1 passent devant les R2 : plus il y en a, plus le surclassement est
                    difficile.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-text-muted">
              Compagnie hors AF/KLM/Transavia : pas de type de billet à préciser ni de remplissage
              à saisir, seul le pari embarque/n&apos;embarque pas sera proposé. Vérifie juste que
              les informations du vol ci-dessus sont correctes.
            </p>
          )}

          <button
            onClick={handleConfirm}
            disabled={saving}
            className="w-full rounded-md bg-amber px-4 py-2 font-medium text-navy hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Publication...' : 'Publier ce vol'}
          </button>
        </div>
      )}
    </main>
  );
}
