import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/currentUser';
import ProfileForm from '@/components/ProfileForm';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const user = await getCurrentUser();
  const next = searchParams.next;
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(next ? `/profile?next=${encodeURIComponent(next)}` : '/profile')}`);
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-2 font-display text-2xl text-text-primary">Mon profil</h1>
      <p className="mb-6 text-sm text-text-muted">
        La date d&apos;entrée en compagnie sert à estimer ta priorité GP dans l&apos;indice de
        difficulté — elle n&apos;est visible que par toi.
      </p>
      {next && !user.seniority_date && (
        <p className="mb-6 rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">
          Renseigne ta date d&apos;entrée en compagnie pour continuer.
        </p>
      )}
      <ProfileForm initialPseudo={user.pseudo} initialSeniorityDate={user.seniority_date} next={next} />
    </main>
  );
}
