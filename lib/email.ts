import { Resend } from 'resend';
import { APP_NAME } from './constants';

// Service d'envoi d'e-mail transactionnel dédié aux e-mails applicatifs
// (le rappel de résultat). Supabase Auth gère ses propres e-mails de
// connexion séparément — celui-ci nécessite sa propre clé API (voir
// RESEND_API_KEY dans .env.local).
export async function sendResultReminderEmail({
  to,
  pseudo,
  flightNumber,
  flightUrl,
}: {
  to: string;
  pseudo: string;
  flightNumber: string;
  flightUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY manquant dans les variables d\'environnement.');
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || `${APP_NAME} <onboarding@resend.dev>`,
    to,
    subject: `${flightNumber} : n'oublie pas de renseigner le résultat`,
    text: `Salut ${pseudo},

Ton vol ${flightNumber} a décollé il y a 24h et le résultat n'a pas encore été renseigné.

Prends deux minutes pour indiquer si tu as embarqué (et dans quelle classe) : ${flightUrl}

— ${APP_NAME}`,
  });
}

// Digest quotidien envoyé aux membres qui ont activé "notify_new_flights"
// dans leur profil — un seul e-mail par jour et par destinataire, listant
// tous les vols postés depuis le dernier envoi (voir app/api/digest).
export async function sendNewFlightsDigestEmail({
  to,
  pseudo,
  flights,
}: {
  to: string;
  pseudo: string;
  flights: { flightNumber: string; leagueName: string; flightUrl: string }[];
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY manquant dans les variables d\'environnement.');
  }

  const resend = new Resend(apiKey);

  const lines = flights.map((f) => `- ${f.flightNumber} (${f.leagueName}) : ${f.flightUrl}`).join('\n');
  const subject =
    flights.length === 1
      ? `Nouveau vol posté sur ${flights[0].leagueName}`
      : `${flights.length} nouveaux vols postés aujourd'hui`;

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || `${APP_NAME} <onboarding@resend.dev>`,
    to,
    subject,
    text: `Salut ${pseudo},

De nouveaux vols ont été postés aujourd'hui dans tes ligues :

${lines}

Tu reçois cet e-mail car tu as activé les notifications de nouveaux vols dans ton profil — tu peux les désactiver à tout moment depuis /profile.

— ${APP_NAME}`,
  });
}
