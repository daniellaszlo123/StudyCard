<script lang="ts">
  import { onMount } from 'svelte';
  import { i18n } from '../i18n.svelte';
  import { deckStore } from '../storage.svelte';
  import { toastStore } from '../toast.svelte';
  import { formatCardText } from '../utils';

  // Props
  let { deckId, onGoBack } = $props<{
    deckId: string;
    onGoBack: () => void;
  }>();

  // Find deck
  const deck = deckStore.decks.find(d => d.id === deckId);

  // Practice state
  let cards = $state(deck ? [...deck.cards] : []);
  let currentIndex = $state(0);
  let isFlipped = $state(false);

  // Derived active card
  let activeCard = $derived(cards[currentIndex]);

  function nextCard() {
    if (currentIndex < cards.length - 1) {
      currentIndex++;
      isFlipped = false;
    }
  }

  function prevCard() {
    if (currentIndex > 0) {
      currentIndex--;
      isFlipped = false;
    }
  }

  function toggleFlip() {
    isFlipped = !isFlipped;
  }

  function shuffleSession() {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    cards = shuffled;
    currentIndex = 0;
    isFlipped = false;
    toastStore.show(i18n.t('shuffle'), 'success');
  }

  // Keyboard navigation support
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggleFlip();
    } else if (e.key === 'ArrowRight' || e.key === 'd') {
      nextCard();
    } else if (e.key === 'ArrowLeft' || e.key === 'a') {
      prevCard();
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  });
</script>

{#if deck && activeCard}
  <div class="practice-container">
    <!-- Navigation Back -->
    <a href="#" class="back-link" style="align-self: flex-start; margin-bottom: 24px;" onclick={(e) => { e.preventDefault(); onGoBack(); }}>
      ⬅️ {i18n.t('backButton')}
    </a>

    <h2 style="margin-bottom: 8px;">{deck.name}</h2>
    
    <div style="margin-bottom: 24px;">
      <button class="btn btn-secondary" onclick={shuffleSession}>
        🔀 {i18n.t('shuffle')}
      </button>
    </div>

    <!-- The Flashcard -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="flashcard-wrapper" onclick={toggleFlip}>
      <div class="flashcard-inner" class:flipped={isFlipped}>
        <!-- Front Side -->
        <div class="flashcard-face flashcard-front">
          <span class="card-badge">{i18n.t('frontPlaceholder')}</span>
          <div class="card-content-wrapper">
            <div class="card-content-text">{@html formatCardText(activeCard.front)}</div>
          </div>
          <span class="card-flip-prompt">
            🔄 {i18n.t('showAnswer')} / Space
          </span>
        </div>
        
        <!-- Back Side -->
        <div class="flashcard-face flashcard-back">
          <span class="card-badge">{i18n.t('backPlaceholder')}</span>
          <div class="card-content-wrapper">
            <div class="card-content-text">{@html formatCardText(activeCard.back)}</div>
          </div>
          <span class="card-flip-prompt">
            🔄 {i18n.t('showAnswer')} / Space
          </span>
        </div>
      </div>
    </div>

    <!-- Navigation Controls -->
    <div class="practice-controls">
      <button 
        class="btn btn-secondary" 
        disabled={currentIndex === 0}
        onclick={prevCard}
      >
        ◀️ {i18n.t('prev')}
      </button>
      
      <span class="progress-text">
        {i18n.t('cardProgress', { current: String(currentIndex + 1), total: String(cards.length) })}
      </span>
      
      <button 
        class="btn btn-secondary" 
        disabled={currentIndex === cards.length - 1}
        onclick={nextCard}
      >
        {i18n.t('next')} ▶️
      </button>
    </div>

    <!-- Helpful Tip -->
    <p style="font-size: 12px; color: var(--text-muted); margin-top: 32px; text-align: center; max-width: 350px;">
      {i18n.t('keyboardTip')}
    </p>
  </div>
{/if}
