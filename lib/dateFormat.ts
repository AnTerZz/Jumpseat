// Formatage des horodatages affichés à l'utilisateur, toujours en heure de
// Paris. Nécessaire car ces pages sont rendues côté serveur (Next.js), où le
// fuseau du processus Node (UTC sur Vercel) ne correspond pas à celui des
// utilisateurs — sans le préciser explicitement, Intl utilise le fuseau du
// serveur et affiche donc l'heure UTC au lieu de l'heure française.

const TIME_ZONE = 'Europe/Paris';

export function formatFlightDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', timeZone: TIME_ZONE });
}

export function formatFlightTime(value: string | Date): string {
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE });
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString('fr-FR', { timeZone: TIME_ZONE });
}
