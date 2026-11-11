import { useEffect, useState } from 'react';
import { deckRepository } from '../database/deck-repository';
import type { Deck } from '../decks/deck';

export function useDeck(id: string | undefined) {
  const [state, setState] = useState<{ deck: Deck | null; loading: boolean; error: boolean }>({ deck: null, loading: true, error: false });
  useEffect(() => {
    let active = true;
    setState({ deck: null, loading: true, error: false });
    if (!id) { setState({ deck: null, loading: false, error: false }); return; }
    deckRepository.getById(id).then((deck) => { if (active) setState({ deck, loading: false, error: false }); })
      .catch((error) => { console.error('Failed to load deck:', error); if (active) setState({ deck: null, loading: false, error: true }); });
    return () => { active = false; };
  }, [id]);
  return state;
}
