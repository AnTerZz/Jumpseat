'use client';

import { useState } from 'react';
import Modal from './Modal';
import CreateLeagueForm from './CreateLeagueForm';
import JoinLeagueForm from './JoinLeagueForm';

export default function LeagueActions() {
  const [modal, setModal] = useState<'join' | 'create' | null>(null);

  return (
    <>
      <div className="flex gap-3">
        <button
          onClick={() => setModal('join')}
          className="flex-1 rounded-md border border-navy-line px-4 py-2 font-medium text-text-primary hover:border-amber"
        >
          Rejoindre une ligue
        </button>
        <button
          onClick={() => setModal('create')}
          className="flex-1 rounded-md bg-amber px-4 py-2 font-medium text-navy hover:opacity-90"
        >
          Créer une ligue
        </button>
      </div>

      <Modal open={modal === 'join'} onClose={() => setModal(null)} title="Rejoindre une ligue">
        <p className="mb-3 text-sm text-text-muted">
          Demande le code d&apos;invitation à un collègue déjà membre (visible dans les réglages
          de sa ligue).
        </p>
        <JoinLeagueForm />
      </Modal>

      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Créer une ligue">
        <CreateLeagueForm />
      </Modal>
    </>
  );
}
