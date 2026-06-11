import type { QuestionBank, Question, QuestionBankStats, QuestionStats } from './types';

const STORAGE_KEY = 'studycard_banks';
const STATS_KEY = 'studycard_bank_stats';

const DEFAULT_BANKS: QuestionBank[] = [
  {
    id: 'sample-geo-bank',
    name: 'World Geography Trivia (Földrajz)',
    createdAt: Date.now() - 120000,
    questions: [
      {
        id: 'geo-q1',
        question: 'What is the capital of France?',
        choices: ['London', 'Paris', 'Rome', 'Berlin'],
        correctAnswer: 'Paris'
      },
      {
        id: 'geo-q2',
        question: 'Which is the largest ocean on Earth?',
        choices: ['Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Arctic Ocean'],
        correctAnswer: 'Pacific Ocean'
      },
      {
        id: 'geo-q3',
        question: 'Which river flows through Egypt?',
        choices: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'],
        correctAnswer: 'Nile'
      },
      {
        id: 'geo-q4',
        question: 'What is the capital of Japan?',
        choices: ['Seoul', 'Beijing', 'Tokyo', 'Bangkok'],
        correctAnswer: 'Tokyo'
      },
      {
        id: 'geo-q5',
        question: 'Which country has the most natural lakes?',
        choices: ['Canada', 'United States', 'Russia', 'China'],
        correctAnswer: 'Canada'
      }
    ]
  },
  {
    id: 'sample-prog-bank',
    name: 'Web Programming Basics (Programozás)',
    createdAt: Date.now() - 60000,
    questions: [
      {
        id: 'prog-q1',
        question: 'Which HTML tag is used to define an internal style sheet?',
        choices: ['<css>', '<script>', '<style>', '<html>'],
        correctAnswer: '<style>'
      },
      {
        id: 'prog-q2',
        question: 'Which language runs natively in a web browser?',
        choices: ['Java', 'PHP', 'Python', 'JavaScript'],
        correctAnswer: 'JavaScript'
      },
      {
        id: 'prog-q3',
        question: 'What does CSS stand for?',
        choices: ['Cascading Style Sheets', 'Computer Style Sheets', 'Colorful Style Sheets', 'Creative Style Sheets'],
        correctAnswer: 'Cascading Style Sheets'
      },
      {
        id: 'prog-q4',
        question: 'Which HTML element is used for the largest heading?',
        choices: ['<h6>', '<head>', '<h1>', '<heading>'],
        correctAnswer: '<h1>'
      },
      {
        id: 'prog-q5',
        question: 'How do you write "Hello World" in an alert box in JavaScript?',
        choices: ['alertBox("Hello World");', 'msg("Hello World");', 'alert("Hello World");', 'msgBox("Hello World");'],
        correctAnswer: 'alert("Hello World");'
      }
    ]
  }
];

function loadBanks(): QuestionBank[] {
  if (typeof localStorage === 'undefined') return DEFAULT_BANKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BANKS));
      return DEFAULT_BANKS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading banks from localStorage, resetting to defaults.', e);
    return DEFAULT_BANKS;
  }
}

function saveBanks(data: QuestionBank[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

function loadStats(): QuestionBankStats {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading bank stats from localStorage', e);
    return {};
  }
}

function saveStats(data: QuestionBankStats) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STATS_KEY, JSON.stringify(data));
  }
}

// Svelte 5 reactive states
let banksState = $state<QuestionBank[]>(loadBanks());
let statsState = $state<QuestionBankStats>(loadStats());

export const bankStore = {
  get banks() {
    return banksState;
  },

  get stats() {
    return statsState;
  },

  createBank(name: string, questions: Question[] = []): QuestionBank {
    const newBank: QuestionBank = {
      id: 'bank-' + Math.random().toString(36).substring(2, 9),
      name: name.trim() || 'Untitled Question Bank',
      questions,
      createdAt: Date.now()
    };
    banksState.push(newBank);
    saveBanks(banksState);
    return newBank;
  },

  updateBank(updatedBank: QuestionBank) {
    const index = banksState.findIndex(b => b.id === updatedBank.id);
    if (index !== -1) {
      banksState[index] = updatedBank;
      saveBanks(banksState);
    }
  },

  deleteBank(id: string) {
    const bank = banksState.find(b => b.id === id);
    if (bank) {
      // Clean up stats for deleted bank's questions
      for (const q of bank.questions) {
        delete statsState[q.id];
      }
      saveStats(statsState);
    }
    banksState = banksState.filter(b => b.id !== id);
    saveBanks(banksState);
  },

  recordAnswer(questionId: string, isCorrect: boolean) {
    if (!statsState[questionId]) {
      statsState[questionId] = { correctCount: 0, wrongCount: 0 };
    }
    if (isCorrect) {
      statsState[questionId].correctCount++;
    } else {
      statsState[questionId].wrongCount++;
    }
    saveStats(statsState);
  },

  clearStats(bankId: string) {
    const bank = banksState.find(b => b.id === bankId);
    if (!bank) return;
    for (const q of bank.questions) {
      delete statsState[q.id];
    }
    saveStats(statsState);
  },

  getQuestionStats(questionId: string): QuestionStats {
    return statsState[questionId] || { correctCount: 0, wrongCount: 0 };
  }
};
