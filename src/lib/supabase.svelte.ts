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
let autoSyncState = $state<boolean>(true);
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

  let finalDecks: any[] = [];
  let finalBanks: any[] = [];
  let finalStats: Record<string, any> = {};

  if (error && error.code === 'PGRST116') {
    // New user, no cloud data. Initialize to empty arrays to separate from guest defaults.
    finalDecks = [];
    finalBanks = [];
    finalStats = {};
    
    // Create sync row in DB
    const { error: initError } = await supabase
      .from('studycard_sync')
      .upsert({
        user_id: userState.id,
        decks: finalDecks,
        banks: finalBanks,
        stats: finalStats,
        updated_at: new Date().toISOString()
      });
      
    if (initError && !silent) {
      toastStore.show(i18n.t('syncFailed') + ': ' + initError.message, 'error');
    }
  } else if (data) {
    // Existing user. Pull cloud data (overwriting local storage/stores)
    finalDecks = data.decks || [];
    finalBanks = data.banks || [];
    finalStats = data.stats || {};
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
