// Outil de dev pour tester le système de score sans attendre le vrai
// décollage. Recule `scheduled_departure` d'un vol dans le passé, ce qui le
// rend immédiatement résolvable (le résultat ne peut être renseigné qu'une
// fois le vol "décollé", voir app/api/flights/[id]/route.ts).
//
// Usage :
//   node scripts/simulate-flight.js                  -> liste les vols à venir
//   node scripts/simulate-flight.js <flightId> [min]  -> recule le vol de
//                                                        <min> minutes dans le
//                                                        passé (5 par défaut)
//
// Ne touche que scheduled_departure, rien d'autre — sans effet sur les paris
// déjà posés. N'existe que localement, jamais déployé (pas dans app/).

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function main() {
  const env = loadEnvLocal();
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY introuvables dans .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const [flightId, minutesArg] = process.argv.slice(2);

  if (!flightId) {
    const { data: flights, error } = await supabase
      .from('flights')
      .select('id, flight_number, league_id, scheduled_departure, status')
      .neq('status', 'resolved')
      .order('scheduled_departure', { ascending: true });

    if (error) {
      console.error('Erreur Supabase :', error.message);
      process.exit(1);
    }
    if (!flights || flights.length === 0) {
      console.log('Aucun vol non résolu trouvé.');
      return;
    }
    console.log('Vols non résolus (copie l\'id pour le passer en argument) :\n');
    for (const f of flights) {
      console.log(`${f.id}  ${f.flight_number}  ligue=${f.league_id}  départ=${f.scheduled_departure}`);
    }
    console.log('\nUsage : node scripts/simulate-flight.js <flightId> [minutesDansLePasse=5]');
    return;
  }

  const minutesAgo = Number(minutesArg) || 5;
  const newDeparture = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();

  const { data: updated, error } = await supabase
    .from('flights')
    .update({ scheduled_departure: newDeparture })
    .eq('id', flightId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Erreur Supabase :', error.message);
    process.exit(1);
  }
  if (!updated) {
    console.error('Aucun vol trouvé avec cet id.');
    process.exit(1);
  }

  console.log(`Vol ${updated.flight_number} : décollage simulé à ${newDeparture} (il y a ${minutesAgo} min).`);
  console.log('Tu peux maintenant aller le résoudre dans l\'UI.');
}

main();
