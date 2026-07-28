import { createClient as createAuthServerClient } from './supabase/server';
import { getSupabase } from './supabaseServer';

// L'identité (qui est connecté) vient de Supabase Auth. Le profil complet
// (pseudo, ancienneté, points...) vient toujours de la base via la clé
// service_role, comme le reste des données de l'app.
export async function getCurrentUser() {
  const authClient = createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return null;

  const supabase = getSupabase();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return profile ?? null;
}
