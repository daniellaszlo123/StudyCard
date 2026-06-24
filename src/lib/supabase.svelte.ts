import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';
import { deckStore } from './storage.svelte';
import { bankStore } from './bankStorage.svelte';
import { toastStore } from './toast.svelte';
import { i18n } from './i18n.svelte';
import type { Deck, QuestionBank, QuestionBankStats } from './types';

const isConfigured = SUPABASE_URL !== "" && SUPABASE_ANON_KEY !== "";
export const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Svelte 5 reactive states
let userState = $state<any>(null);
let loadingState = $state<boolean>(true);
let syncLoadingState = $state<boolean>(false);
let autoSyncState = $state<boolean>(true);
let lastSyncedState = $state<string>(localStorage.getItem('studycard_lastsynced') || '');

if (supabase) {
  let hasMerged = false;

  // Recover session
  supabase.auth.getSession().then(({ data: { session } }) => {
    userState = session?.user || null;
    loadingState = false;

    const hasUser = !!session?.user;
    deckStore.isCloud = hasUser;
    bankStore.isCloud = hasUser;
  });

  // Listen to auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    userState = session?.user || null;
    loadingState = false;

    const hasUser = !!session?.user;
    deckStore.isCloud = hasUser;
    bankStore.isCloud = hasUser;

    if (hasUser && !hasMerged) {
      hasMerged = true;
      syncMerge(true);
    }
    if (!hasUser) {
      hasMerged = false;
    }
  });
} else {
  loadingState = false;
}

// Convert username to studycard.com email
function toEmail(username: string): string {
  return username.trim().toLowerCase() + "@studycard.com";
}

// Extract username from email
export function getUsername(email: string | undefined): string {
  if (!email) return '';
  return email.split('@')[0];
}

async function triggerAutoSync() {
  if (isConfigured && autoSyncState && userState && supabase) {
    await supabase
      .from('studycard_sync')
      .upsert({
        user_id: userState.id,
        decks: deckStore.decks,
        banks: bankStore.banks,
        stats: bankStore.stats,
        updated_at: new Date().toISOString()
      });
  }
}

// Register store listeners for auto sync
deckStore.onStoreChange(() => triggerAutoSync());
bankStore.onStoreChange(() => triggerAutoSync());

export const supabaseService = {
  get isConfigured() {
    return isConfigured;
  },

  get user() {
    return userState;
  },

  get loading() {
    return loadingState;
  },

  get syncLoading() {
    return syncLoadingState;
  },

  get autoSync() {
    return true;
  },

  set autoSync(value: boolean) {
    // Sync is always automatic and cannot be disabled
  },

  get lastSynced() {
    return lastSyncedState;
  },

  async signUp(username: string, password: string) {
    if (!isConfigured || !supabase) return { error: "Database not configured" };
    loadingState = true;
    const email = toEmail(username);
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    loadingState = false;
    if (error) return { error: error.message };
    return { success: true };
  },

  async signIn(username: string, password: string) {
    if (!isConfigured || !supabase) return { error: "Database not configured" };
    loadingState = true;
    const email = toEmail(username);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    loadingState = false;
    if (error) return { error: error.message };
    return { success: true };
  },

  async signOut() {
    if (!supabase) return;
    loadingState = true;
    await supabase.auth.signOut();
    userState = null;
    
    // Reset cloud status so resetDecks/resetBanks write to localStorage
    deckStore.isCloud = false;
    bankStore.isCloud = false;
    
    // Clear user data on log out (resets to defaults)
    deckStore.resetDecks();
    bankStore.resetBanks();
    
    localStorage.removeItem('studycard_lastsynced');
    lastSyncedState = '';
    loadingState = false;
    toastStore.show(i18n.t('save'), 'success'); // Just generic action confirm
  },

  async push() {
    if (!isConfigured || !supabase || !userState) return;
    syncLoadingState = true;

    const { error } = await supabase
      .from('studycard_sync')
      .upsert({
        user_id: userState.id,
        decks: deckStore.decks,
        banks: bankStore.banks,
        stats: bankStore.stats,
        updated_at: new Date().toISOString()
      });

    syncLoadingState = false;
    if (error) {
      toastStore.show(i18n.t('syncFailed') + ': ' + error.message, 'error');
    } else {
      lastSyncedState = new Date().toLocaleString();
      localStorage.setItem('studycard_lastsynced', lastSyncedState);
      toastStore.show(i18n.t('syncSuccess'), 'success');
    }
  },

  async pull() {
    if (!isConfigured || !supabase || !userState) return;
    syncLoadingState = true;

    const { data, error } = await supabase
      .from('studycard_sync')
      .select('decks, banks, stats')
      .eq('user_id', userState.id)
      .single();

    syncLoadingState = false;
    if (error) {
      if (error.code === 'PGRST116') {
        toastStore.show(i18n.t('noCloudData') || 'No remote data found', 'error');
        return;
      }
      toastStore.show(i18n.t('syncFailed') + ': ' + error.message, 'error');
      return;
    }

    if (data) {
      deckStore.setDecks(data.decks || []);
      bankStore.setBanksAndStats(data.banks || [], data.stats || {});
      lastSyncedState = new Date().toLocaleString();
      localStorage.setItem('studycard_lastsynced', lastSyncedState);
      toastStore.show(i18n.t('syncSuccess'), 'success');
    }
  },

  async merge(silent = false) {
    await syncMerge(silent);
  }
};

function mergeDecks(local: Deck[], remote: Deck[]): Deck[] {
  const merged = [...remote];
  for (const lDeck of local) {
    const rDeckIdx = merged.findIndex(d => d.id === lDeck.id);
    if (rDeckIdx === -1) {
      merged.push(lDeck);
    } else {
      const rDeck = merged[rDeckIdx];
      const mergedCards = [...rDeck.cards];
      for (const lCard of lDeck.cards) {
        if (!mergedCards.some(c => c.id === lCard.id)) {
          mergedCards.push(lCard);
        }
      }
      merged[rDeckIdx] = { ...rDeck, cards: mergedCards };
    }
  }
  return merged;
}

function mergeBanks(local: QuestionBank[], remote: QuestionBank[]): QuestionBank[] {
  const merged = [...remote];
  for (const lBank of local) {
    const rBankIdx = merged.findIndex(b => b.id === lBank.id);
    if (rBankIdx === -1) {
      merged.push(lBank);
    } else {
      const rBank = merged[rBankIdx];
      const mergedQuestions = [...rBank.questions];
      for (const lQ of lBank.questions) {
        if (!mergedQuestions.some(q => q.id === lQ.id)) {
          mergedQuestions.push(lQ);
        }
      }
      merged[rBankIdx] = { ...rBank, questions: mergedQuestions };
    }
  }
  return merged;
}

function mergeStats(local: QuestionBankStats, remote: QuestionBankStats): QuestionBankStats {
  const merged = { ...remote };
  for (const [qId, lStats] of Object.entries(local)) {
    if (merged[qId]) {
      merged[qId] = {
        correctCount: (merged[qId].correctCount || 0) + (lStats.correctCount || 0),
        wrongCount: (merged[qId].wrongCount || 0) + (lStats.wrongCount || 0)
      };
    } else {
      merged[qId] = { ...lStats };
    }
  }
  return merged;
}

async function syncMerge(silent = false) {
  if (!isConfigured || !supabase || !userState) return;
  if (!silent) syncLoadingState = true;

  const { data, error } = await supabase
    .from('studycard_sync')
    .select('decks, banks, stats')
    .eq('user_id', userState.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    if (!silent) {
      syncLoadingState = false;
      toastStore.show(i18n.t('syncFailed') + ': ' + error.message, 'error');
    }
    return;
  }

  // Get current local in-memory data before marking as cloud (so we merge what was loaded)
  const localDecks = deckStore.decks;
  const localBanks = bankStore.banks;
  const localStats = bankStore.stats;

  let finalDecks: any[] = [];
  let finalBanks: any[] = [];
  let finalStats: Record<string, any> = {};

  if (error && error.code === 'PGRST116') {
    // New user, no cloud data. Merge local data with empty cloud.
    finalDecks = mergeDecks(localDecks, []);
    finalBanks = mergeBanks(localBanks, []);
    finalStats = mergeStats(localStats, {});
  } else if (data) {
    // Existing user. Merge local data with remote data.
    const remoteDecks = data.decks || [];
    const remoteBanks = data.banks || [];
    const remoteStats = data.stats || {};
    
    finalDecks = mergeDecks(localDecks, remoteDecks);
    finalBanks = mergeBanks(localBanks, remoteBanks);
    finalStats = mergeStats(localStats, remoteStats);
  }

  // Push merged data to database
  const { error: upsertError } = await supabase
    .from('studycard_sync')
    .upsert({
      user_id: userState.id,
      decks: finalDecks,
      banks: finalBanks,
      stats: finalStats,
      updated_at: new Date().toISOString()
    });

  if (upsertError) {
    if (!silent) {
      syncLoadingState = false;
      toastStore.show(i18n.t('syncFailed') + ': ' + upsertError.message, 'error');
    }
    return;
  }

  // Clear local storage keys since we're now synced to DB
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('studycard_decks');
    localStorage.removeItem('studycard_banks');
    localStorage.removeItem('studycard_bank_stats');
  }

  // Update local stores
  deckStore.setDecks(finalDecks);
  bankStore.setBanksAndStats(finalBanks, finalStats);

  // Set last synced timestamp
  lastSyncedState = new Date().toLocaleString();
  localStorage.setItem('studycard_lastsynced', lastSyncedState);

  if (!silent) {
    syncLoadingState = false;
    toastStore.show(i18n.t('syncSuccess'), 'success');
  }
}
