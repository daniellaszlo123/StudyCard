<script lang="ts">
  import { i18n } from './lib/i18n.svelte';
  import { toastStore } from './lib/toast.svelte';
  import type { AppView } from './lib/types';
  import DeckList from './lib/components/DeckList.svelte';
  import DeckDetail from './lib/components/DeckDetail.svelte';
  import PracticeMode from './lib/components/PracticeMode.svelte';
  import ExamMode from './lib/components/ExamMode.svelte';

  let currentView = $state<AppView>('deck-list');
  let selectedDeckId = $state<string | null>(null);

  function navigateTo(view: AppView, deckId: string | null = null) {
    currentView = view;
    if (deckId !== null) {
      selectedDeckId = deckId;
    }
  }

  function handleSelectDeck(deckId: string) {
    navigateTo('deck-detail', deckId);
  }

  function handleGoBack() {
    if (currentView === 'deck-detail') {
      navigateTo('deck-list');
    } else if (currentView === 'practice' || currentView === 'exam') {
      navigateTo('deck-detail');
    }
  }
</script>

<div class="app-container">
  <header class="app-header">
    <a href="#" class="brand" onclick={(e) => { e.preventDefault(); navigateTo('deck-list'); }}>
      <div class="brand-icon">🗂️</div>
      <h1>{i18n.t('appTitle')}</h1>
    </a>
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
