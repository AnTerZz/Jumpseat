import { createClient } from '@supabase/supabase-js';

let client: ReturnType<typeof createClient> | null = null;

// Toutes les requêtes à Supabase passent par ce client, exécuté uniquement
// côté serveur (Server Components et Route Handlers). Le navigateur ne parle
// jamais directement à Supabase : pas besoin de clé anon/publique, ni de
// Supabase Auth, ce qui simplifie beaucoup les choses pour un outil interne.
export function getSupabase() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans les variables d\'environnement.');
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
