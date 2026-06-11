<script lang="ts">
  import { i18n } from './lib/i18n.svelte';
  import { toastStore } from './lib/toast.svelte';
  import type { AppView } from './lib/types';
  import DeckList from './lib/components/DeckList.svelte';
  import DeckDetail from './lib/components/DeckDetail.svelte';
  import PracticeMode from './lib/components/PracticeMode.svelte';
  import ExamMode from './lib/components/ExamMode.svelte';
  import BankList from './lib/components/BankList.svelte';
  import BankDetail from './lib/components/BankDetail.svelte';
  import BankExam from './lib/components/BankExam.svelte';

  let currentView = $state<AppView>('deck-list');
  let selectedDeckId = $state<string | null>(null);
  let selectedBankId = $state<string | null>(null);
  let bankExamConfig = $state<{ count: number, mode: 'random' | 'difficult' } | null>(null);

  function navigateTo(view: AppView, targetId: string | null = null) {
    currentView = view;
    if (targetId !== null) {
      if (view === 'deck-detail' || view === 'practice' || view === 'exam') {
        selectedDeckId = targetId;
      } else if (view === 'bank-detail' || view === 'bank-exam') {
        selectedBankId = targetId;
      }
    }
  }

  function handleSelectDeck(deckId: string) {
    navigateTo('deck-detail', deckId);
  }

  function handleSelectBank(bankId: string) {
    navigateTo('bank-detail', bankId);
  }

  function handleGoBack() {
    if (currentView === 'deck-detail') {
      navigateTo('deck-list');
    } else if (currentView === 'practice' || currentView === 'exam') {
      navigateTo('deck-detail');
    } else if (currentView === 'bank-detail') {
      navigateTo('bank-list');
    } else if (currentView === 'bank-exam') {
      navigateTo('bank-detail');
    }
  }
</script>

<div class="app-container">
  <header class="app-header" style="flex-wrap: wrap; gap: 12px;">
    <a href="#" class="brand" onclick={(e) => { e.preventDefault(); navigateTo('deck-list'); }}>
      <div class="brand-icon">🗂️</div>
      <h1>{i18n.t('appTitle')}</h1>
    </a>

    <!-- Mode switch: Flashcards vs Question Banks -->
    <div class="mode-switch">
      <button 
        class="mode-btn" 
        class:active={currentView === 'deck-list' || currentView === 'deck-detail' || currentView === 'practice' || currentView === 'exam'} 
        onclick={() => navigateTo('deck-list')}
      >
        🎴 {i18n.t('menuDecks')}
      </button>
      <button 
        class="mode-btn" 
        class:active={currentView === 'bank-list' || currentView === 'bank-detail' || currentView === 'bank-exam'} 
        onclick={() => navigateTo('bank-list')}
      >
        🎓 {i18n.t('menuQuestionBanks')}
      </button>
    </div>

    <div class="header-controls">
      <div class="lang-switch">
        <button 
          class="lang-btn" 
          class:active={i18n.locale === 'en'} 
          onclick={() => i18n.locale = 'en'}
        >
          EN
        </button>
        <button 
          class="lang-btn" 
          class:active={i18n.locale === 'hu'} 
          onclick={() => i18n.locale = 'hu'}
        >
          HU
        </button>
      </div>
    </div>
  </header>

  <main class="main-content">
    {#if currentView === 'deck-list'}
      <DeckList onSelectDeck={handleSelectDeck} />
    {:else if currentView === 'deck-detail' && selectedDeckId}
      <DeckDetail 
        deckId={selectedDeckId} 
        onGoBack={handleGoBack} 
        onStartPractice={() => navigateTo('practice')}
        onStartExam={() => navigateTo('exam')}
      />
    {:else if currentView === 'practice' && selectedDeckId}
      <PracticeMode deckId={selectedDeckId} onGoBack={handleGoBack} />
    {:else if currentView === 'exam' && selectedDeckId}
      <ExamMode deckId={selectedDeckId} onGoBack={handleGoBack} />
    {:else if currentView === 'bank-list'}
      <BankList onSelectBank={handleSelectBank} />
    {:else if currentView === 'bank-detail' && selectedBankId}
      <BankDetail 
        bankId={selectedBankId} 
        onGoBack={handleGoBack} 
        onStartExam={(count, mode) => {
          bankExamConfig = { count, mode };
          navigateTo('bank-exam');
        }}
      />
    {:else if currentView === 'bank-exam' && selectedBankId && bankExamConfig}
      <BankExam 
        bankId={selectedBankId} 
        count={bankExamConfig.count} 
        mode={bankExamConfig.mode} 
        onGoBack={handleGoBack} 
      />
    {/if}
  </main>

  {#if toastStore.message}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="toast toast-{toastStore.type}" onclick={() => toastStore.dismiss()}>
      {toastStore.message}
    </div>
  {/if}
</div>

<style>
  .mode-switch {
    display: flex;
    background-color: var(--bg-tertiary);
    padding: 4px;
    border-radius: var(--radius-full);
    border: 1px solid var(--border-color);
    gap: 4px;
  }
  
  .mode-btn {
    background: none;
    border: none;
    padding: 8px 16px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: var(--radius-full);
    transition: var(--transition-smooth);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .mode-btn.active {
    background-color: var(--bg-secondary);
    color: var(--primary);
    box-shadow: var(--shadow-sm);
  }

  @media (max-width: 768px) {
    .mode-switch {
      order: 3;
      width: 100%;
      margin-top: 8px;
      justify-content: center;
    }
    .mode-btn {
      padding: 6px 12px;
      font-size: 13px;
      flex: 1;
      justify-content: center;
    }
  }
</style>
