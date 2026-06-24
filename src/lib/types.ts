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

export type AppView = 
  | 'deck-list' 
  | 'deck-detail' 
  | 'practice' 
  | 'exam'
  | 'bank-list'
  | 'bank-detail'
  | 'bank-exam';

export interface ExamSession {
  deckId: string;
  totalCards: number;
  cards: Card[];
  currentIndex: number;
  answers: Record<string, boolean>; // card.id -> true (correct) or false (incorrect)
  isFinished: boolean;
}

export interface Question {
  id: string;
  question: string;
  choices: string[];
  correctAnswer: string;
}

export interface QuestionBank {
  id: string;
  name: string;
  questions: Question[];
  createdAt: number;
}

export interface QuestionStats {
  correctCount: number;
  wrongCount: number;
}

export type QuestionBankStats = Record<string, QuestionStats>;

export type BankExamMode = 'random' | 'difficult' | 'least-solved';
