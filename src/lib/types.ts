export interface Card {
  id: string;
  front: string;
  back: string;
}

export interface Deck {
  id: string;
  name: string;
  cards: Card[];
  createdAt: number;
}

export type AppView = 'deck-list' | 'deck-detail' | 'practice' | 'exam';

export interface ExamSession {
  deckId: string;
  totalCards: number;
  cards: Card[];
  currentIndex: number;
  answers: Record<string, boolean>; // card.id -> true (correct) or false (incorrect)
  isFinished: boolean;
}
