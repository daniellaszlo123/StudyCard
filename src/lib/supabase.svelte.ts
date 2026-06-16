import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';
import { deckStore } from './storage.svelte';
import { bankStore } from './bankStorage.svelte';
import { toastStore } from './toast.svelte';
import { i18n } from './i18n.svelte';

const isConfigured = SUPABASE_URL !== "" && SUPABASE_ANON_KEY !== "";
export const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Svelte 5 reactive states
let userState = $state<any>(null);
let loadingState = $state<boolean>(true);
let syncLoadingState = $state<boolean>(false);
let autoSyncState = $state<boolean>(localStorage.getItem('studycard_autosync') !== 'false');
let lastSyncedState = $state<string>(localStorage.getItem('studycard_lastsynced') || '');

if (supabase) {
  // Recover session
  supabase.auth.getSession().then(({ data: { session } }) => {
    userState = session?.user || null;
    loadingState = false;
  });

  // Listen to auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    userState = session?.user || null;
    loadingState = false;

    if (event === 'SIGNED_IN' && session?.user) {
      // Perform initial merge when signing in
      syncMerge(true);
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
    return autoSyncState;
  },

  set autoSync(value: boolean) {
    autoSyncState = value;
    localStorage.setItem('studycard_autosync', String(value));
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

  const remoteDecks = (data?.decks || []) as any[];
  const remoteBanks = (data?.banks || []) as any[];
  const remoteStats = (data?.stats || {}) as Record<string, any>;

  // Merge Decks
  const mergedDecks = [...deckStore.decks];
  for (const rd of remoteDecks) {
    const localIndex = mergedDecks.findIndex(ld => ld.id === rd.id);
    if (localIndex === -1) {
      mergedDecks.push(rd);
    } else {
      const ld = mergedDecks[localIndex];
      const mergedCards = [...ld.cards];
      for (const rc of rd.cards) {
        const lcIndex = mergedCards.findIndex(lc => lc.id === rc.id);
        if (lcIndex === -1) {
          mergedCards.push(rc);
        }
      }
      mergedDecks[localIndex] = {
        ...ld,
        cards: mergedCards
      };
    }
  }

  // Merge Banks
  const mergedBanks = [...bankStore.banks];
  for (const rb of remoteBanks) {
    const localIndex = mergedBanks.findIndex(lb => lb.id === rb.id);
    if (localIndex === -1) {
      mergedBanks.push(rb);
    } else {
      const lb = mergedBanks[localIndex];
      const mergedQuestions = [...lb.questions];
      for (const rq of rb.questions) {
        const lqIndex = mergedQuestions.findIndex(lq => lq.id === rq.id);
        if (lqIndex === -1) {
          mergedQuestions.push(rq);
        }
      }
      mergedBanks[localIndex] = {
        ...lb,
        questions: mergedQuestions
      };
    }
  }

  // Merge Stats
  const mergedStats = { ...bankStore.stats };
  for (const [qId, rStat] of Object.entries(remoteStats)) {
    const lStat = mergedStats[qId];
    if (!lStat) {
      mergedStats[qId] = rStat;
    } else {
      mergedStats[qId] = {
        correctCount: Math.max(lStat.correctCount, rStat.correctCount),
        wrongCount: Math.max(lStat.wrongCount, rStat.wrongCount)
      };
    }
  }

  // Update local stores
  deckStore.setDecks(mergedDecks);
  bankStore.setBanksAndStats(mergedBanks, mergedStats);

  // Upload merged copy to the database
  const { error: uploadError } = await supabase
    .from('studycard_sync')
    .upsert({
      user_id: userState.id,
      decks: mergedDecks,
      banks: mergedBanks,
      stats: mergedStats,
      updated_at: new Date().toISOString()
    });

  if (!silent) {
    syncLoadingState = false;
    if (uploadError) {
      toastStore.show(i18n.t('syncFailed') + ': ' + uploadError.message, 'error');
    } else {
      lastSyncedState = new Date().toLocaleString();
      localStorage.setItem('studycard_lastsynced', lastSyncedState);
      toastStore.show(i18n.t('syncSuccess'), 'success');
    }
  }
}
