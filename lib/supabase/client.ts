import { createBrowserClient } from '@supabase/ssr';

// Client Supabase utilisé côté navigateur, UNIQUEMENT pour l'authentification
// (lien magique par e-mail, déconnexion). Toutes les requêtes de données
// (vols, paris, ligues...) continuent de passer par les Route Handlers
// serveur avec la clé service_role (lib/supabaseServer.ts) — ce client-ci ne
// sert jamais à lire/écrire les données métier directement.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
