import type { Deck, Card } from './types';

const STORAGE_KEY = 'studycard_decks';

const DEFAULT_DECKS: Deck[] = [
  {
    id: 'sample-lang',
    name: 'English - Hungarian (Nyelvek)',
    createdAt: Date.now() - 100000,
    cards: [
      { id: 'l1', front: 'apple', back: 'alma' },
      { id: 'l2', front: 'car', back: 'autó' },
      { id: 'l3', front: 'house', back: 'ház' },
      { id: 'l4', front: 'cat', back: 'macska' },
      { id: 'l5', front: 'dog', back: 'kutya' },
      { id: 'l6', front: 'sun', back: 'nap' },
      { id: 'l7', front: 'water', back: 'víz' },
      { id: 'l8', front: 'bread', back: 'kenyér' }
    ]
  },
  {
    id: 'sample-trivia',
    name: 'General Trivia (Műveltség)',
    createdAt: Date.now() - 50000,
    cards: [
      { id: 't1', front: 'What is the capital of Hungary?', back: 'Budapest' },
      { id: 't2', front: 'How many continents are there on Earth?', back: '7' },
      { id: 't3', front: 'Who painted the Mona Lisa?', back: 'Leonardo da Vinci' },
      { id: 't4', front: 'What is the chemical symbol for Gold?', back: 'Au' },
      { id: 't5', front: 'Which planet is closest to the Sun?', back: 'Mercury' },
      { id: 't6', front: 'What is the largest ocean on Earth?', back: 'Pacific Ocean' }
    ]
  }
];

function loadDecks(): Deck[] {
  if (typeof localStorage === 'undefined') return DEFAULT_DECKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Initialize with default decks if first run
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DECKS));
      return DEFAULT_DECKS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading decks from localStorage, resetting to defaults.', e);
    return DEFAULT_DECKS;
  }
}

let changeListener: (() => void) | null = null;
let isCloudState = $state(false);

function saveDecks(data: Deck[]) {
  if (typeof localStorage !== 'undefined' && !isCloudState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  if (changeListener) changeListener();
}

// Svelte 5 reactive decks store
let decksState = $state<Deck[]>(loadDecks());

export const deckStore = {
  get isCloud() {
    return isCloudState;
  },
  set isCloud(value: boolean) {
    isCloudState = value;
  },

  get decks() {
    return decksState;
  },
  
  createDeck(name: string, cards: Card[] = []): Deck {
    const newDeck: Deck = {
      id: 'deck-' + Math.random().toString(36).substring(2, 9),
      name: name.trim() || 'Untitled Deck',
      cards,
      createdAt: Date.now()
    };
    decksState.push(newDeck);
    saveDecks(decksState);
    return newDeck;
  },

  updateDeck(updatedDeck: Deck) {
    const index = decksState.findIndex(d => d.id === updatedDeck.id);
    if (index !== -1) {
      decksState[index] = updatedDeck;
      saveDecks(decksState);
    }
  },

  deleteDeck(id: string) {
    decksState = decksState.filter(d => d.id !== id);
    saveDecks(decksState);
  },

  shuffleDeck(id: string) {
    const index = decksState.findIndex(d => d.id === id);
    if (index !== -1) {
      const deck = decksState[index];
      // Fisher-Yates shuffle algorithm
      const shuffledCards = [...deck.cards];
      for (let i = shuffledCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
      }
      decksState[index] = { ...deck, cards: shuffledCards };
      saveDecks(decksState);
    }
  },

  onStoreChange(listener: () => void) {
    changeListener = listener;
  },

  setDecks(newDecks: Deck[]) {
    decksState = newDecks;
    saveDecks(decksState);
  },

  resetDecks() {
    decksState = [...DEFAULT_DECKS];
    saveDecks(decksState);
  }
};
