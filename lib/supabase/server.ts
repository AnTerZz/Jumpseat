import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Équivalent serveur du client ci-dessus, utilisé dans les Server Components
// et Route Handlers UNIQUEMENT pour lire l'utilisateur authentifié
// (auth.getUser(), exchangeCodeForSession). Les données métier passent par
// lib/supabaseServer.ts (clé service_role), pas par ce client.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Appelé depuis un Server Component (pas une Route Handler) :
            // on ne peut pas écrire de cookie ici. Sans conséquence tant que
            // le middleware rafraîchit la session sur chaque requête.
          }
        },
      },
    }
  );
}
